import express from "express";
import { getMiniKafkaStats } from "../kafka/mini-kafka-admin.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const data = await getMiniKafkaStats();
    res.json({ success: true, streaming: data });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "Mini-Kafka broker unavailable",
      details: error.message,
    });
  }
});

export default router;
