import { BROKERS, requestBroker } from "./lib/cluster.js";

async function requestCluster(message) {
  let lastError;
  for (const broker of BROKERS) {
    try {
      const response = await requestBroker(broker, message, 2500);
      if (response?.success) return response;
      lastError = new Error(response?.error || "Broker request failed");
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("No Mini-Kafka broker available");
}

export class MiniKafkaConsumer {
  constructor(groupId = "default", consumerId = `consumer-${process.pid}`) {
    this.groupId = groupId;
    this.consumerId = consumerId;
    this.joined = false;
    this.heartbeatTimer = null;
  }

  async connect() {
    const response = await requestCluster({ type: "join", groupId: this.groupId, consumerId: this.consumerId });
    this.joined = true;
    this.heartbeatTimer = setInterval(() => {
      requestCluster({ type: "heartbeat", groupId: this.groupId, consumerId: this.consumerId }).catch(() => {});
    }, 2000);
    console.log(`✅ Consumer joined | group=${this.groupId} | consumer=${this.consumerId} | partitions=${response.assignment?.join(",") || "waiting"}`);
    return response;
  }

  async consume(topic) {
    if (!this.joined) await this.connect();
    const response = await requestCluster({ type: "consume", topic, groupId: this.groupId, consumerId: this.consumerId });
    return response.messages;
  }

  async ack(topic, partition, offset) {
    return requestCluster({ type: "ack", topic, groupId: this.groupId, consumerId: this.consumerId, partition, offset });
  }

  async disconnect() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    if (this.joined) { try { await requestCluster({ type: "leave", groupId: this.groupId, consumerId: this.consumerId }); } catch {} }
    this.joined = false;
    console.log(`🔌 Consumer left | group=${this.groupId} | consumer=${this.consumerId}`);
  }
}
