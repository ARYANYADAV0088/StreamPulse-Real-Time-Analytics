import net from "net";
import fs from "fs";
import {
  BROKER_ID, PORT, PARTITION_COUNT, REPLICATION_FACTOR, BROKERS,
  brokerById, replicaSet, partitionForKey, requestBroker, aliveBrokers,
} from "./lib/cluster.js";
import {
  ensureTopic, readPartition, appendRecord, replacePartition, listTopics,
  getCommittedOffset, commitOffset, brokerStorageRoot,
} from "./lib/storage.js";

const CONSUMER_MEMBER_TTL_MS = Number(process.env.MINI_KAFKA_HEARTBEAT_TTL_MS || 5000);
const RETENTION_MAX_RECORDS = Number(process.env.MINI_KAFKA_RETENTION_MAX_RECORDS || 0);
const groups = new Map();

function send(socket, payload) { socket.write(`${JSON.stringify(payload)}\n`); }
function membersFor(groupId) {
  if (!groups.has(groupId)) groups.set(groupId, new Map());
  const members = groups.get(groupId);
  const now = Date.now();
  for (const [id, info] of members) {
    if (now - info.lastSeen > CONSUMER_MEMBER_TTL_MS) {
      members.delete(id);
      console.log(`⏱️ REBALANCE | removed stale consumer=${id} | group=${groupId}`);
    }
  }
  return members;
}
function assignment(groupId, consumerId) {
  const members = [...membersFor(groupId).keys()].sort();
  const index = members.indexOf(consumerId);
  if (index < 0) return [];
  return Array.from({ length: PARTITION_COUNT }, (_, p) => p).filter((p) => p % members.length === index);
}
async function syncGroup(groupId, consumerId, lastSeen) {
  await Promise.all(BROKERS.filter((b) => b.id !== BROKER_ID).map(async (b) => {
    try { await requestBroker(b, { type: "group-sync", groupId, consumerId, lastSeen }, 500); } catch {}
  }));
}
async function syncOffset(groupId, topic, partition, offset) {
  await Promise.all(BROKERS.filter((b) => b.id !== BROKER_ID).map(async (b) => {
    try { await requestBroker(b, { type: "offset-sync", groupId, topic, partition, offset }, 700); } catch {}
  }));
}
function trimPartition(topic, partition) {
  if (!RETENTION_MAX_RECORDS) return;
  const records = readPartition(topic, partition);
  if (records.length > RETENTION_MAX_RECORDS) replacePartition(topic, partition, records.slice(-RETENTION_MAX_RECORDS));
}

async function handle(message, socket) {
  const { type, topic, value, key, groupId = "default", consumerId } = message;

  if (type === "ping") return send(socket, { success: true, type: "pong", brokerId: BROKER_ID, port: PORT });
  if (type === "list-topics") return send(socket, { success: true, topics: listTopics() });
  if (type === "group-sync") {
    if (!groups.has(groupId)) groups.set(groupId, new Map());
    groups.get(groupId).set(consumerId, { lastSeen: Number(lastSeenSafe(message.lastSeen)) });
    return send(socket, { success: true });
  }
  if (type === "offset-sync") {
    commitOffset(groupId, topic, Number(message.partition), Number(message.offset));
    return send(socket, { success: true });
  }
  if (["stats", "cluster-stats", "create-topic"].includes(type)) { /* handled below */ }
  if (!topic && !["stats", "cluster-stats", "create-topic", "join", "heartbeat", "leave", "group-sync", "group-leave-sync", "offset-sync", "ping"].includes(type)) return send(socket, { success: false, error: "Topic is required" });

  if (type === "create-topic") {
    const count = Number(message.partitions || PARTITION_COUNT);
    ensureTopic(topic, count);
    return send(socket, { success: true, topic, partitions: count });
  }

  if (type === "publish" || type === "publish-batch") {
    if (type === "publish-batch") {
      if (!Array.isArray(message.messages) || !message.messages.length) return send(socket, { success: false, error: "messages must be a non-empty array" });
      const results = [];
      for (const item of message.messages) {
        const response = await publish(topic, item.value, item.key ?? "", message.internalForward);
        if (!response.success) return send(socket, response);
        results.push({ partition: response.partition, offset: response.offset });
      }
      const distribution = results.reduce((a, r) => ((a[r.partition] = (a[r.partition] || 0) + 1), a), {});
      console.log(`📨 PUBLISHED BATCH → ${topic} | messages=${results.length} | partitions=${JSON.stringify(distribution)}`);
      return send(socket, { success: true, type: "published-batch", topic, count: results.length, results });
    }
    const response = await publish(topic, value, key ?? "", message.internalForward);
    return send(socket, response);
  }

  if (type === "replicate") {
    ensureTopic(topic, PARTITION_COUNT);
    const partition = Number(message.partition);
    const records = readPartition(topic, partition);
    const record = message.record;
    const existing = records.find((r) => r.offset === record.offset);
    if (!existing) {
      const expected = records.length ? records[records.length - 1].offset + 1 : 0;
      if (expected !== record.offset) return send(socket, { success: false, error: `Replica gap: expected offset ${expected}, got ${record.offset}` });
      appendRecord(topic, partition, record);
    } else if (record.committed && existing.committed !== true) {
      replacePartition(topic, partition, records.map((r) => r.offset === record.offset ? { ...r, committed: true } : r));
    }
    trimPartition(topic, partition);
    return send(socket, { success: true, type: "replicated", partition, offset: record.offset });
  }

  if (type === "join" || type === "heartbeat") {
    if (!consumerId) return send(socket, { success: false, error: "consumerId is required" });
    const members = membersFor(groupId);
    members.set(consumerId, { lastSeen: Date.now() });
    syncGroup(groupId, consumerId, Date.now()).catch(() => {});
    const memberList = [...members.keys()].sort();
    console.log(`👥 GROUP ${type.toUpperCase()} | ${groupId} | members=${memberList.join(", ")}`);
    return send(socket, { success: true, type: type === "join" ? "joined" : "heartbeat", groupId, consumerId, members: memberList, assignment: assignment(groupId, consumerId) });
  }

  if (type === "leave") {
    if (consumerId && groups.has(groupId)) groups.get(groupId).delete(consumerId);
    await Promise.all(BROKERS.filter((b) => b.id !== BROKER_ID).map(async (b) => { try { await requestBroker(b, { type: "group-leave-sync", groupId, consumerId }, 500); } catch {} }));
    return send(socket, { success: true, type: "left" });
  }
  if (type === "group-leave-sync") {
    if (groups.has(groupId)) groups.get(groupId).delete(consumerId);
    return send(socket, { success: true });
  }

  if (type === "consume") {
    if (!consumerId) return send(socket, { success: false, error: "consumerId is required" });
    const members = membersFor(groupId);
    members.set(consumerId, { lastSeen: Date.now() });
    syncGroup(groupId, consumerId, Date.now()).catch(() => {});
    const assigned = assignment(groupId, consumerId);
    const messages = [];
    for (const partition of assigned) {
      const records = readPartition(topic, partition).filter((r) => r.committed !== false);
      const committed = getCommittedOffset(groupId, topic, partition);
      messages.push(...records.filter((r) => r.offset >= committed).map((r) => ({ ...r, partition })));
    }
    console.log(`📥 CONSUME | ${consumerId} (${groupId}) | partitions=[${assigned.join(", ")}] | messages=${messages.length}`);
    return send(socket, { success: true, type: "messages", messages, assignment: { consumerId, members: [...members.keys()].sort(), partitions: assigned } });
  }

  if (type === "ack") {
    if (!consumerId || !Number.isInteger(message.partition) || !Number.isInteger(message.offset)) return send(socket, { success: false, error: "consumerId, topic, partition and offset are required" });
    const next = Number(message.offset) + 1;
    commitOffset(groupId, topic, Number(message.partition), next);
    syncOffset(groupId, topic, Number(message.partition), next).catch(() => {});
    return send(socket, { success: true, type: "acknowledged", partition: Number(message.partition), offset: Number(message.offset), committedOffset: next });
  }

  if (type === "stats" || type === "cluster-stats") {
    const alive = await aliveBrokers();
    const topicNames = listTopics();
    const topics = {};
    for (const name of topicNames) {
      const partitions = Array.from({ length: PARTITION_COUNT }, (_, p) => {
        const records = readPartition(name, p);
        return { partition: p, messages: records.length, nextOffset: records.length ? records[records.length - 1].offset + 1 : 0, replicas: replicaSet(p).map((b) => b.id), leader: replicaSet(p).find((b) => alive.some((a) => a.id === b.id))?.id || null };
      });
      topics[name] = { partitionCount: PARTITION_COUNT, totalMessages: partitions.reduce((s, p) => s + p.messages, 0), partitions };
    }
    const groupData = [...groups.entries()].map(([gid, members]) => {
      const list = [...members.keys()].sort();
      return { groupId: gid, consumers: list, assignments: list.map((id) => ({ consumerId: id, partitions: assignment(gid, id), lag: Object.fromEntries(topicNames.map((t) => [t, assignment(gid, id).map((p) => ({ partition: p, committedOffset: getCommittedOffset(gid, t, p), endOffset: readPartition(t, p).length, lag: Math.max(readPartition(t, p).length - getCommittedOffset(gid, t, p), 0) }))])) })) };
    });
    return send(socket, { success: true, broker: { status: "healthy", brokerId: BROKER_ID, port: PORT, partitionCount: PARTITION_COUNT, replicationFactor: REPLICATION_FACTOR, storage: brokerStorageRoot(), topics, consumerGroups: groupData, cluster: BROKERS.map((b) => ({ ...b, alive: alive.some((a) => a.id === b.id) })), replication: { factor: REPLICATION_FACTOR, quorum: Math.floor(REPLICATION_FACTOR / 2) + 1 } } });
  }

  return send(socket, { success: false, error: `Unknown message type: ${type}` });
}

function lastSeenSafe(v) { return Number.isFinite(Number(v)) ? Number(v) : Date.now(); }

async function publish(topic, value, key, internalForward = false) {
  ensureTopic(topic, PARTITION_COUNT);
  const partition = partitionForKey(key || JSON.stringify(value));
  const replicas = replicaSet(partition);
  const alive = await aliveBrokers();
  const leader = replicas.find((b) => alive.some((a) => a.id === b.id));
  if (!leader) return { success: false, error: `No live replica for partition ${partition}` };
  if (leader.id !== BROKER_ID && !internalForward) {
    return requestBroker(leader, { type: "publish", topic, value, key, internalForward: true }, 2000);
  }
  const local = readPartition(topic, partition);
  const offset = local.length;
  const record = { offset, key, value, timestamp: new Date().toISOString(), committed: false };
  appendRecord(topic, partition, record);
  const quorum = Math.floor(replicas.length / 2) + 1;
  let acknowledgements = 1;
  await Promise.all(replicas.filter((b) => b.id !== BROKER_ID).map(async (b) => {
    try {
      const response = await requestBroker(b, { type: "replicate", topic, partition, record }, 1200);
      if (response.success) acknowledgements++;
    } catch {}
  }));
  if (acknowledgements >= quorum) {
    const records = readPartition(topic, partition);
    const updated = records.map((r) => r.offset === offset ? { ...r, committed: true } : r);
    replacePartition(topic, partition, updated);
    await Promise.all(replicas.filter((b) => b.id !== BROKER_ID).map(async (b) => {
      try { await requestBroker(b, { type: "replicate", topic, partition, record: { ...record, committed: true } }, 1200); } catch {}
    }));
    trimPartition(topic, partition);
    console.log(`📤 EVENT PUBLISHED | topic=${topic} | key=${key || "-"} | partition=P${partition} | offset=${offset} | leader=B${BROKER_ID} | replicas=${acknowledgements}/${replicas.length}`);
    return { success: true, type: "published", topic, partition, offset, leader: BROKER_ID, replicas: acknowledgements };
  }
  console.error(`❌ QUORUM FAILED | topic=${topic} | partition=P${partition} | acknowledgements=${acknowledgements}/${replicas.length}`);
  return { success: false, error: `Replication quorum not reached (${acknowledgements}/${replicas.length})` };
}

const server = net.createServer((socket) => {
  console.log(`🔌 Client connected | broker=B${BROKER_ID}`);
  let buffer = "";
  socket.on("data", (data) => {
    buffer += data.toString();
    let index;
    while ((index = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, index).trim(); buffer = buffer.slice(index + 1);
      if (!line) continue;
      try { Promise.resolve(handle(JSON.parse(line), socket)).catch((e) => send(socket, { success: false, error: e.message })); }
      catch (e) { send(socket, { success: false, error: e.message }); }
    }
  });
  socket.on("close", () => console.log(`🔌 Client disconnected | broker=B${BROKER_ID}`));
  socket.on("error", (error) => {
  console.warn(`⚠️ Socket error | broker=B${BROKER_ID} | ${error.code || error.message}`);
});
});

server.listen(PORT, () => {
  console.log(`🚀 Mini-Kafka broker B${BROKER_ID} running on port ${PORT}`);
  console.log(`📦 Partitions/topic=${PARTITION_COUNT} | replication.factor=${REPLICATION_FACTOR}`);
  console.log(`🗄️ Persistent log directory: ${brokerStorageRoot()}`);
  console.log(`🧭 Cluster: ${BROKERS.map((b) => `B${b.id}@${b.port}`).join(" | ")}`);
});
