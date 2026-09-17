import { MiniKafkaProducer } from "./producer.js";
import { MiniKafkaConsumer } from "./consumer.js";

const producer = new MiniKafkaProducer();
const consumer = new MiniKafkaConsumer("demo-group", "demo-consumer");

await producer.connect();

const result = await producer.send("events", {
  eventType: "click",
  userId: "mini-kafka-user",
});

console.log("📤 Publish result:", result);

await consumer.connect();
const messages = await consumer.consume("events");

console.log("📥 Consume result:", messages);

await consumer.disconnect();
await producer.disconnect();
