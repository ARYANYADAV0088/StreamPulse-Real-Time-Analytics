import {
  BROKERS, requestBroker,
} from "./lib/cluster.js";

async function requestCluster(message, timeout = 2500) {
  let lastError;
  for (const broker of BROKERS) {
    try {
      const response = await requestBroker(broker, message, timeout);
      if (response?.success) return response;
      lastError = new Error(response?.error || "Broker request failed");
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("No Mini-Kafka broker available");
}

export class MiniKafkaProducer {
  async connect() {
    console.log(`✅ Mini-Kafka producer ready | seeds=${BROKERS.map((b) => `${b.host}:${b.port}`).join(",")}`);
  }

  async send(topic, value, key = "") {
    return requestCluster({ type: "publish", topic, key, value });
  }

  async sendBatch(topic, messages) {
    return requestCluster({ type: "publish-batch", topic, messages }, Number(process.env.MINI_KAFKA_BATCH_TIMEOUT_MS || 30000));
  }

  async createTopic(topic, partitions) {
    return requestCluster({ type: "create-topic", topic, partitions });
  }

  async disconnect() { console.log("🔌 Mini-Kafka producer disconnected"); }
}
