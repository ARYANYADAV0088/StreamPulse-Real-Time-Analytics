import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import "dotenv/config";
import crypto from "crypto";

import { connectDatabase } from "./config/database.js";
import { EventProducer } from "./kafka/event-producer.js";
import { EventConsumer } from "./kafka/event-consumer.js";
import { getMiniKafkaStats } from "./kafka/mini-kafka-admin.js";
import { StatsService } from "./services/stats-service.js";
import eventRoutes from "./routes/event-routes.js";
import analyticsRoutes from "./routes/analytics-routes.js";
import streamingRoutes from "./routes/streaming-routes.js";


const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const PORT = Number(process.env.PORT || 3001);
const startedAt = Date.now();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "100kb" }));

// Lightweight in-memory rate limiter for the demo API.
const requestBuckets = new Map();
app.use("/events", (req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const bucket = requestBuckets.get(ip) || { start: now, count: 0 };

  if (now - bucket.start > 60_000) {
    bucket.start = now;
    bucket.count = 0;
  }

  bucket.count += 1;
  requestBuckets.set(ip, bucket);

  if (bucket.count > 300) {
    return res.status(429).json({
      success: false,
      error: "Too many event requests. Try again shortly.",
    });
  }

  next();
});

const statsService = new StatsService();
const eventProducer = new EventProducer();
const eventConsumer = new EventConsumer(statsService, io);

app.use("/events", eventRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/streaming", streamingRoutes);

app.get("/", (req, res) => {
  res.json({
    service: "Real-Time Event Streaming & Analytics Platform",
    status: "running",
    version: "3.0.0",
  });
});

app.get("/health", async (req, res) => {
  let broker = "unavailable";

  try {
    await getMiniKafkaStats();
    broker = "healthy";
  } catch {
    // Report degraded health instead of crashing the endpoint.
  }

  const mongo =
    process.env.MONGO_URI && globalThis.__mongoReady
      ? "healthy"
      : "unknown";

  const healthy = broker === "healthy" && mongo === "healthy";

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    services: {
      api: "healthy",
      mongodb: mongo,
      miniKafka: broker,
      websocket: io.engine?.clientsCount >= 0 ? "healthy" : "unknown",
    },
  });
});

app.get("/stats", (req, res) => {
  res.json(statsService.getCurrentStats());
});

app.get("/metrics", async (req, res) => {
  try {
    const brokerResponse = await getMiniKafkaStats();

    res.json({
      success: true,
      api: {
        uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        websocketClients: io.engine.clientsCount,
      },
      processing: statsService.getCurrentStats(),
      broker: brokerResponse.broker,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "Streaming metrics unavailable",
      details: error.message,
    });
  }
});

app.post("/events", async (req, res) => {
  try {
    const { eventType, userId } = req.body;

    if (!["click", "view", "signup"].includes(eventType)) {
      return res.status(400).json({
        success: false,
        error: "eventType must be click, view or signup",
      });
    }

    const cleanUserId = String(userId || `user_${crypto.randomUUID()}`)
      .trim()
      .slice(0, 120);

    if (!cleanUserId) {
      return res.status(400).json({
        success: false,
        error: "userId cannot be empty",
      });
    }

    const eventData = {
      eventId: crypto.randomUUID(),
      eventType,
      userId: cleanUserId,
      timestamp: new Date().toISOString(),
      metadata: {
        page: String(req.body.page || "/").slice(0, 200),
        source: String(req.body.source || "dashboard").slice(0, 100),
        userAgent: String(req.get("User-Agent") || "").slice(0, 300),
      },
    };

    const result = await eventProducer.sendEvent(eventData);

    res.status(202).json({
      success: true,
      message: "Event accepted for processing",
      event: {
        ...eventData,
        partition: result.partition,
        offset: result.offset,
      },
    });
  } catch (error) {
    console.error("❌ Error sending event:", error);
    res.status(503).json({
      success: false,
      error: "Event pipeline unavailable",
    });
  }
});

app.post("/events/bulk", async (req, res) => {
  try {
    const count = Number(req.body.count);

    if (!Number.isInteger(count) || count < 1 || count > 5000) {
      return res.status(400).json({
        success: false,
        error: "count must be an integer between 1 and 5000",
      });
    }

    const types = ["click", "view", "signup"];
    const events = Array.from({ length: count }, () => ({
      eventId: crypto.randomUUID(),
      eventType: types[Math.floor(Math.random() * types.length)],
      userId: `loadtest_${Math.floor(Math.random() * 250)}`,
      timestamp: new Date().toISOString(),
      metadata: { page: "/load-test", source: "load-test" },
    }));

    const start = performance.now();
    const result = await eventProducer.sendEvents(events);
    const durationMs = Math.round(performance.now() - start);

    res.status(202).json({
      success: true,
      message: "Batch accepted for processing",
      count,
      durationMs,
      partitions: [...new Set(result.results.map((item) => item.partition))],
    });
  } catch (error) {
    console.error("❌ Error sending batch:", error);
    res.status(503).json({
      success: false,
      error: "Event pipeline unavailable",
    });
  }
});

io.on("connection", (socket) => {
  socket.emit("stats-update", statsService.getCurrentStats());
  socket.on("disconnect", () => {});
});

async function startServer() {
  try {
    console.log("🚀 Starting Real-Time Event Platform...");

    await connectDatabase();
    globalThis.__mongoReady = true;

    await statsService.loadStatsFromDatabase();

    await eventProducer.connect();
    await eventConsumer.connect();

    server.listen(PORT, () => {
      console.log(`🌟 API running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket running on ws://localhost:${PORT}`);
      console.log(`📊 Dashboard expected at http://localhost:5173`);
    });
  } catch (error) {
    console.error("❌ Startup failed:", error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`🛑 ${signal} received. Shutting down...`);
  await eventConsumer.disconnect();
  await eventProducer.disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
