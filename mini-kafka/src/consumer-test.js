import { MiniKafkaProducer } from "./producer.js";
import { MiniKafkaConsumer } from "./consumer.js";

const producer = new MiniKafkaProducer();
await producer.connect();

for (const userId of ["user-101", "user-202", "user-303", "user-404", "user-505"]) {
  await producer.send(
    "group-test",
    { eventType: "signup", userId },
    userId
  );
}

await producer.disconnect();

const consumerA = new MiniKafkaConsumer("group-test-group", "consumer-1");
const consumerB = new MiniKafkaConsumer("group-test-group", "consumer-2");

await consumerA.connect();
await consumerB.connect();

const [messagesA, messagesB] = await Promise.all([
  consumerA.consume("group-test"),
  consumerB.consume("group-test"),
]);

console.log("\n📥 Consumer 1:");
for (const message of messagesA) {
  console.log(`partition=${message.partition} offset=${message.offset} user=${message.value.userId}`);
}

console.log("\n📥 Consumer 2:");
for (const message of messagesB) {
  console.log(`partition=${message.partition} offset=${message.offset} user=${message.value.userId}`);
}

await consumerA.disconnect();
await consumerB.disconnect();
