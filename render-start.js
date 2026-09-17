import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const kafkaDir = path.join(root, "mini-kafka");

const brokers = [
  { id: "1", port: 9090 },
  { id: "2", port: 9091 },
  { id: "3", port: 9092 },
];

const brokerList = brokers
  .map(({ id, port }) => `${id}@127.0.0.1:${port}`)
  .join(",");

const children = [];

for (const broker of brokers) {
  const child = spawn(process.execPath, ["src/broker.js"], {
    cwd: kafkaDir,
    env: {
      ...process.env,
      BROKER_ID: broker.id,
      MINI_KAFKA_PORT: String(broker.port),
      MINI_KAFKA_BROKERS: brokerList,
      MINI_KAFKA_DATA_DIR: "./data",
      MINI_KAFKA_PARTITIONS: process.env.MINI_KAFKA_PARTITIONS || "3",
      MINI_KAFKA_REPLICATION_FACTOR:
        process.env.MINI_KAFKA_REPLICATION_FACTOR || "3",
    },
    stdio: "inherit",
  });

  children.push(child);
}

await new Promise((resolve) => setTimeout(resolve, 1200));

const backend = spawn(process.execPath, ["server.js"], {
  cwd: path.join(root, "backend"),
  env: {
    ...process.env,
    MINI_KAFKA_PORT: process.env.MINI_KAFKA_PORT || "9090",
    MINI_KAFKA_BROKERS: brokerList,
    MINI_KAFKA_DATA_DIR:
      process.env.MINI_KAFKA_DATA_DIR || "./mini-kafka/data",
    MINI_KAFKA_PARTITIONS: process.env.MINI_KAFKA_PARTITIONS || "3",
    MINI_KAFKA_REPLICATION_FACTOR:
      process.env.MINI_KAFKA_REPLICATION_FACTOR || "3",
  },
  stdio: "inherit",
});

children.push(backend);

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

backend.on("exit", (code, signal) => {
  shutdown();
  process.exit(code ?? (signal ? 1 : 0));
});