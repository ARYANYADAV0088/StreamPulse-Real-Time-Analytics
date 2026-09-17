import { describe, test, expect, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import crypto from "crypto";

function createTestApp(producer) {
  const app = express();
  app.use(express.json());

  app.post("/events", async (req, res) => {
    const { eventType, userId } = req.body;

    if (!["click", "view", "signup"].includes(eventType)) {
      return res.status(400).json({
        success: false,
        error: "eventType must be click, view or signup",
      });
    }

    const eventData = {
      eventId: crypto.randomUUID(),
      eventType,
      userId: String(userId || "generated-user"),
      timestamp: new Date().toISOString(),
      metadata: {
        page: String(req.body.page || "/"),
        source: String(req.body.source || "dashboard"),
      },
    };

    try {
      const result = await producer.sendEvent(eventData);
      return res.status(202).json({
        success: true,
        message: "Event accepted for processing",
        event: { ...eventData, ...result },
      });
    } catch {
      return res.status(503).json({
        success: false,
        error: "Event pipeline unavailable",
      });
    }
  });

  return app;
}

describe("Event API contract", () => {
  test("accepts valid events", async () => {
    const producer = {
      sendEvent: jest.fn().mockResolvedValue({ partition: 1, offset: 4 }),
    };

    const response = await request(createTestApp(producer))
      .post("/events")
      .send({ eventType: "click", userId: "user-123", page: "/home" });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(response.body.event.eventType).toBe("click");
    expect(response.body.event.partition).toBe(1);
    expect(producer.sendEvent).toHaveBeenCalled();
  });

  test("rejects invalid event types", async () => {
    const producer = { sendEvent: jest.fn() };

    const response = await request(createTestApp(producer))
      .post("/events")
      .send({ eventType: "purchase", userId: "user-1" });

    expect(response.status).toBe(400);
    expect(producer.sendEvent).not.toHaveBeenCalled();
  });

  test("returns service unavailable when broker fails", async () => {
    const producer = {
      sendEvent: jest.fn().mockRejectedValue(new Error("broker down")),
    };

    const response = await request(createTestApp(producer))
      .post("/events")
      .send({ eventType: "view", userId: "user-1" });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
  });
});
