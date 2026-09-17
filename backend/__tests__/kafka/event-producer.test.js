import {
  describe,
  test,
  expect,
  jest,
} from "@jest/globals";

describe("EventProducer", () => {
  test("exposes the Mini-Kafka producer and events topic", async () => {
    const { EventProducer } = await import("../../kafka/event-producer.js");
    const producer = new EventProducer();

    expect(producer.topicName).toBe("events");
    expect(producer.producer).toBeDefined();
    expect(typeof producer.connect).toBe("function");
    expect(typeof producer.sendEvent).toBe("function");
    expect(typeof producer.sendEvents).toBe("function");
    expect(typeof producer.disconnect).toBe("function");
  });

  test("sends an event using userId as the partition key", async () => {
    const { EventProducer } = await import("../../kafka/event-producer.js");
    const producer = new EventProducer();

    producer.producer.send = jest.fn().mockResolvedValue({
      partition: 2,
      offset: 7,
    });

    const event = {
      eventId: "evt-1",
      eventType: "click",
      userId: "user-123",
      timestamp: new Date().toISOString(),
    };

    const result = await producer.sendEvent(event);

    expect(producer.producer.send).toHaveBeenCalledWith(
      "events",
      event,
      "user-123"
    );
    expect(result).toEqual({ partition: 2, offset: 7 });
  });

  test("publishes bulk events as one batch", async () => {
    const { EventProducer } = await import("../../kafka/event-producer.js");
    const producer = new EventProducer();

    producer.producer.sendBatch = jest.fn().mockResolvedValue({
      count: 2,
      results: [],
    });

    await producer.sendEvents([
      { eventId: "1", userId: "a", eventType: "view" },
      { eventId: "2", userId: "b", eventType: "click" },
    ]);

    expect(producer.producer.sendBatch).toHaveBeenCalledWith("events", [
      { key: "a", value: { eventId: "1", userId: "a", eventType: "view" } },
      { key: "b", value: { eventId: "2", userId: "b", eventType: "click" } },
    ]);
  });
});
