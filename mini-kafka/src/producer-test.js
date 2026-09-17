import { MiniKafkaProducer } from "./producer.js";

const producer = new MiniKafkaProducer();

await producer.connect();

const users = [
  "user-101",
  "user-202",
  "user-303",
  "user-404",
  "user-505",
];

for (const userId of users) {
  const result = await producer.send(
    "events",
    {
      eventType: "signup",
      userId,
    },
    userId
  );

  console.log(
    `User ${userId} → partition ${result.partition}, offset ${result.offset}`
  );
}

await producer.disconnect();