import {
  describe,
  test,
  expect,
  jest,
  beforeEach,
} from "@jest/globals";

const mockCreate = jest.fn();

jest.unstable_mockModule("../../models/Event.js", () => ({
  Event: { create: mockCreate },
}));

const { EventConsumer } = await import("../../kafka/event-consumer.js");

describe("EventConsumer", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({ _id: "mongo-id" });
  });

  test("configures an events consumer group", () => {
    const stats = {
      updateStats: jest.fn(),
      getCurrentStats: jest.fn().mockReturnValue({ total: 1 }),
    };
    const io = { emit: jest.fn() };

    const consumer = new EventConsumer(stats, io);

    expect(consumer.topicName).toBe("events");
    expect(consumer.consumer).toBeDefined();
  });

  test("persists, updates stats and broadcasts a valid event", async () => {
    const stats = {
      updateStats: jest.fn(),
      getCurrentStats: jest.fn().mockReturnValue({ total: 1 }),
    };
    const io = { emit: jest.fn() };

    const consumer = new EventConsumer(stats, io);

    const message = {
      partition: 1,
      offset: 4,
      value: {
        eventId: "evt-123",
        eventType: "signup",
        userId: "user-123",
        timestamp: "2026-01-01T00:00:00.000Z",
        metadata: { page: "/signup" },
      },
    };

    const result = await consumer.handleMessage(message);

    expect(result).toBe(true);
    expect(mockCreate).toHaveBeenCalledWith({
      eventId: "evt-123",
      eventType: "signup",
      userId: "user-123",
      timestamp: message.value.timestamp,
      metadata: { page: "/signup" },
      partition: 1,
      offset: 4,
    });
    expect(stats.updateStats).toHaveBeenCalledWith("signup");
    expect(io.emit).toHaveBeenCalledWith(
      "event-received",
      expect.objectContaining({
        eventId: "evt-123",
        partition: 1,
        offset: 4,
      })
    );
    expect(io.emit).toHaveBeenCalledWith("stats-update", { total: 1 });
  });

  test("acknowledges duplicate events without double counting", async () => {
    mockCreate.mockRejectedValue({ code: 11000 });

    const stats = {
      updateStats: jest.fn(),
      getCurrentStats: jest.fn(),
    };
    const io = { emit: jest.fn() };

    const consumer = new EventConsumer(stats, io);

    const result = await consumer.handleMessage({
      partition: 0,
      offset: 1,
      value: {
        eventId: "duplicate",
        eventType: "click",
        userId: "user",
        timestamp: new Date().toISOString(),
      },
    });

    expect(result).toBe(true);
    expect(stats.updateStats).not.toHaveBeenCalled();
    expect(io.emit).not.toHaveBeenCalled();
  });

  test("rejects malformed events without crashing", async () => {
    const stats = {
      updateStats: jest.fn(),
      getCurrentStats: jest.fn(),
    };
    const io = { emit: jest.fn() };

    const consumer = new EventConsumer(stats, io);

    const result = await consumer.handleMessage({
      value: { eventType: "click" },
    });

    expect(result).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(stats.updateStats).not.toHaveBeenCalled();
  });
});
