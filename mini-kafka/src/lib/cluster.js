import net from "net";
import path from "path";
import { fileURLToPath } from "url";

export const BROKER_ID = String(process.env.BROKER_ID || "1");
export const PORT = Number(process.env.MINI_KAFKA_PORT || process.env.BROKER_PORT || 9090);
export const PARTITION_COUNT = Number(process.env.MINI_KAFKA_PARTITIONS || 3);
export const REPLICATION_FACTOR = Math.max(1, Number(process.env.MINI_KAFKA_REPLICATION_FACTOR || 3));
export const REQUEST_TIMEOUT_MS = Number(process.env.MINI_KAFKA_REQUEST_TIMEOUT_MS || 1200);
export const HEARTBEAT_TTL_MS = Number(process.env.MINI_KAFKA_HEARTBEAT_TTL_MS || 5000);
export const DATA_DIR = process.env.MINI_KAFKA_DATA_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");

export function parseBrokers(raw = process.env.MINI_KAFKA_BROKERS || "1@localhost:9090,2@localhost:9091,3@localhost:9092") {
  return raw.split(",").map((entry) => {
    const [id, address] = entry.trim().split("@");
    const [host, port] = address.split(":");
    return { id: String(id), host, port: Number(port) };
  }).filter((b) => b.id && b.host && b.port);
}

export const BROKERS = parseBrokers();

export function brokerById(id) { return BROKERS.find((b) => String(b.id) === String(id)); }

export function replicaSet(partition) {
  const sorted = [...BROKERS].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const count = Math.min(REPLICATION_FACTOR, sorted.length);
  const start = partition % sorted.length;
  return Array.from({ length: count }, (_, i) => sorted[(start + i) % sorted.length]);
}

export async function requestBroker(broker, message, timeout = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: broker.host, port: broker.port });
    let buffer = "";
    let settled = false;
    const finish = (fn, value) => { if (!settled) { settled = true; socket.destroy(); fn(value); } };
    const timer = setTimeout(() => finish(reject, new Error(`Broker ${broker.id} request timed out`)), timeout);
    socket.on("connect", () => socket.write(`${JSON.stringify(message)}\n`));
    socket.on("data", (data) => {
      buffer += data.toString();
      const index = buffer.indexOf("\n");
      if (index === -1) return;
      clearTimeout(timer);
      try { finish(resolve, JSON.parse(buffer.slice(0, index))); }
      catch (e) { finish(reject, e); }
    });
    socket.on("error", (e) => { clearTimeout(timer); finish(reject, e); });
  });
}

export async function brokerAlive(broker) {
  try {
    const response = await requestBroker(broker, { type: "ping" }, 450);
    return response?.success === true;
  } catch { return false; }
}

export async function aliveBrokers() {
  const results = await Promise.all(BROKERS.map(async (b) => ({ broker: b, alive: await brokerAlive(b) })));
  return results.filter((x) => x.alive).map((x) => x.broker);
}

export function partitionForKey(key = "") {
  let hash = 0;
  for (const char of String(key)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % PARTITION_COUNT;
}

export function groupCoordinator(groupId) {
  const sorted = [...BROKERS].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  let hash = 0;
  for (const char of groupId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return sorted[hash % sorted.length];
}
