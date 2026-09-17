import { MiniKafkaProducer } from "../../mini-kafka/src/producer.js";

export class EventProducer {
  constructor() {
    this.producer = new MiniKafkaProducer();
    this.topicName = "events";
  }

  async connect() {
    await this.producer.connect();
    console.log("✅ Event producer connected to Mini-Kafka");
  }

  async sendEvent(eventData) {
    const result = await this.producer.send(
      this.topicName,
      eventData,
      eventData.userId
    );

    console.log(
      `📤 Event sent → ${eventData.eventType} | partition=${result.partition} | offset=${result.offset}`
    );

    return result;
  }

  async sendEvents(events) {
    const batchSize = Number(process.env.KAFKA_BATCH_SIZE || 100);
    const allResults = [];
    const startedAt = Date.now();

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize).map((event) => ({
        key: event.userId,
        value: event,
      }));
      const result = await this.producer.sendBatch(this.topicName, batch);
      allResults.push(...(result.results || []));
    }

    return {
      success: true,
      type: "published-batch",
      topic: this.topicName,
      count: allResults.length,
      results: allResults,
      durationMs: Date.now() - startedAt,
    };
  }

  async disconnect() {
    await this.producer.disconnect();
  }
}
