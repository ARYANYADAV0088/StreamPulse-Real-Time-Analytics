import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { MiniKafkaProducer } from "./producer.js";
import { MiniKafkaConsumer } from "./consumer.js";
import { requestBroker, BROKERS } from "./lib/cluster.js";

const root = path.resolve("./data-smoke");
fs.rmSync(root, { recursive: true, force: true });
const children = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const broker of BROKERS) {
  const child = spawn(process.execPath, [path.resolve("./src/broker.js")], {
    cwd: process.cwd(),
    env: { ...process.env, BROKER_ID: broker.id, MINI_KAFKA_PORT: String(broker.port), MINI_KAFKA_DATA_DIR: root },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (d) => process.stdout.write(`[B${broker.id}] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[B${broker.id}] ${d}`));
  children.push(child);
}

try {
  await sleep(1800);
  const producer = new MiniKafkaProducer();
  await producer.connect();
  const first = await producer.send("smoke-events", { eventType: "click", userId: "failover-user" }, "failover-user");
  const second = await producer.send("smoke-events", { eventType: "view", userId: "stable-user" }, "stable-user");
  console.log("PASS publish", { first, second });

  const consumer = new MiniKafkaConsumer("smoke-group", "smoke-consumer");
  await consumer.connect();
  const messages = await consumer.consume("smoke-events");
  for (const message of messages) await consumer.ack("smoke-events", message.partition, message.offset);
  console.log(`PASS consume ${messages.length} messages`);

  const leaderId = first.leader;
  const leaderIndex = BROKERS.findIndex((b) => b.id === leaderId);
  if (leaderIndex < 0) throw new Error(`Unknown leader ${leaderId}`);
  children[leaderIndex].kill("SIGTERM");
  await sleep(1400);
  const afterFailover = await producer.send("smoke-events", { eventType: "signup", userId: "failover-user" }, "failover-user");
  if (!afterFailover.success || afterFailover.leader === leaderId) throw new Error("Leader failover did not occur");
  console.log("PASS leader failover publish", afterFailover);

  const statsBroker = BROKERS.find((b) => b.id === afterFailover.leader) || BROKERS.find((b) => b.id !== leaderId);
  const stats = await requestBroker(statsBroker, { type: "stats" }, 2500);
  if (!stats.success) throw new Error(stats.error);
  console.log("PASS replicated cluster stats", JSON.stringify(stats.broker.cluster));
  await consumer.disconnect();
  await producer.disconnect();
  console.log("\n✅ Mini-Kafka cluster smoke test passed");
} finally {
  for (const child of children) { try { child.kill("SIGTERM"); } catch {} }
  await sleep(300);
  fs.rmSync(root, { recursive: true, force: true });
}
