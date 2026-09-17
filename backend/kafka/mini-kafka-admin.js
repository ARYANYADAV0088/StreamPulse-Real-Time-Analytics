import { BROKERS, requestBroker } from "../../mini-kafka/src/lib/cluster.js";

export async function getMiniKafkaStats() {
  let lastError;
  for (const broker of BROKERS) {
    try {
      const response = await requestBroker(broker, { type: "stats" }, 1800);
      if (response?.success) return response;
      lastError = new Error(response?.error || "Broker stats request failed");
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error("No Mini-Kafka broker available");
}
