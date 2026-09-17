import fs from "fs";
import path from "path";
import { BROKER_ID, DATA_DIR } from "./cluster.js";

const root = path.resolve(DATA_DIR, `broker-${BROKER_ID}`);
const topicDir = (topic) => path.join(root, "topics", topic);
const partitionFile = (topic, partition) => path.join(topicDir(topic), `partition-${partition}.log`);
const offsetFile = path.join(root, "consumer-offsets.json");

fs.mkdirSync(path.join(root, "topics"), { recursive: true });

export function ensureTopic(topic, partitions) {
  fs.mkdirSync(topicDir(topic), { recursive: true });
  for (let p = 0; p < partitions; p++) {
    const file = partitionFile(topic, p);
    if (!fs.existsSync(file)) fs.writeFileSync(file, "");
  }
}

export function readPartition(topic, partition) {
  ensureTopic(topic, partition + 1);
  const file = partitionFile(topic, partition);
  const text = fs.readFileSync(file, "utf8");
  if (!text.trim()) return [];
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

export function appendRecord(topic, partition, record) {
  ensureTopic(topic, partition + 1);
  fs.appendFileSync(partitionFile(topic, partition), `${JSON.stringify(record)}\n`);
}

export function replacePartition(topic, partition, records) {
  ensureTopic(topic, partition + 1);
  fs.writeFileSync(partitionFile(topic, partition), records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""));
}

export function listTopics() {
  const dir = path.join(root, "topics");
  return fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : [];
}

export function readOffsets() {
  try { return JSON.parse(fs.readFileSync(offsetFile, "utf8")); } catch { return {}; }
}

export function writeOffsets(offsets) {
  fs.mkdirSync(root, { recursive: true });
  const tmp = `${offsetFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(offsets, null, 2));
  fs.renameSync(tmp, offsetFile);
}

export function getCommittedOffset(groupId, topic, partition) {
  const offsets = readOffsets();
  return Number(offsets[`${groupId}:${topic}:${partition}`] || 0);
}

export function commitOffset(groupId, topic, partition, offset) {
  const offsets = readOffsets();
  const key = `${groupId}:${topic}:${partition}`;
  offsets[key] = Math.max(Number(offsets[key] || 0), Number(offset));
  writeOffsets(offsets);
  return offsets[key];
}

export function brokerStorageRoot() { return root; }
