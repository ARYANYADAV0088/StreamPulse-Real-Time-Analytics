import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "kafka-demo-app",
  brokers: ["localhost:9092"],
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

export { kafka };
