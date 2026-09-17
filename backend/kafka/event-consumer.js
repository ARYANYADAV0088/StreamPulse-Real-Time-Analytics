import { MiniKafkaConsumer } from "../../mini-kafka/src/consumer.js";
import { Event } from "../models/Event.js";

export class EventConsumer {
  constructor(statsService, socketIo) {
    this.consumer = new MiniKafkaConsumer(
      process.env.KAFKA_CONSUMER_GROUP || "analytics-consumers",
      process.env.KAFKA_CONSUMER_ID || `backend-${process.pid}`
    );
    this.statsService = statsService;
    this.io = socketIo;
    this.topicName = "events";
    this.running = false;
  }

  async connect() {
    await this.consumer.connect();
    this.running = true;
    console.log("✅ Mini-Kafka consumer connected and listening");
    this.startPolling();
  }

  async startPolling() {
    console.log("🔄 Event consumer polling started");

    while (this.running) {
      try {
        const messages = await this.consumer.consume(this.topicName);

        for (const message of messages) {
          const processed = await this.handleMessage(message);

          if (processed) {
            await this.consumer.ack(
              this.topicName,
              message.partition,
              message.offset
            );
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error("❌ Mini-Kafka polling error:", error.message);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  async handleMessage(message) {
    const eventData = message.value;

    if (!eventData?.eventId || !eventData?.eventType || !eventData?.userId) {
      console.warn("⚠️ Skipping malformed event");
      return true;
    }

    try {
      const savedEvent = await Event.create({
        eventId: eventData.eventId,
        eventType: eventData.eventType,
        userId: eventData.userId,
        timestamp: eventData.timestamp,
        metadata: eventData.metadata || {},
        partition: message.partition,
        offset: message.offset,
      });

      this.statsService.updateStats(eventData.eventType);

      const stats = this.statsService.getCurrentStats();

      this.io.emit("event-received", {
        ...eventData,
        partition: message.partition,
        offset: message.offset,
      });
      this.io.emit("stats-update", stats);
      return true;
    } catch (error) {
      if (error?.code === 11000) {
        console.warn(`↩️ Duplicate event ignored: ${eventData.eventId}`);
        return true;
      }

      console.error("❌ Error processing event:", error);
      return false;
    }
  }

  async disconnect() {
    this.running = false;
    await this.consumer.disconnect();
  }
}
