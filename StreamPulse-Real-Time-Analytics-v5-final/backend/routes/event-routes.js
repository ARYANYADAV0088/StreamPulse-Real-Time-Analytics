import express from "express";
import { Event } from "../models/Event.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const eventType = req.query.type;
    const userId = String(req.query.userId || "").trim();
    const search = String(req.query.search || "").trim();

    const filter = {};
    if (["click", "view", "signup"].includes(eventType)) {
      filter.eventType = eventType;
    }
    if (userId) filter.userId = userId;
    if (search) {
      filter.$or = [
        { userId: { $regex: search, $options: "i" } },
        { eventId: { $regex: search, $options: "i" } },
        { "metadata.page": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(filter),
    ]);

    res.json({
      success: true,
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching event history:", error);
    res.status(500).json({ success: false, error: "Failed to fetch event history" });
  }
});

export default router;
