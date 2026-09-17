import express from "express";
import { Event } from "../models/Event.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const hours = Math.min(Math.max(Number(req.query.hours) || 24, 1), 168);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [uniqueUsers, eventCounts, topPages, topUsers, timeline] =
      await Promise.all([
        Event.distinct("userId"),

        Event.aggregate([
          { $group: { _id: "$eventType", count: { $sum: 1 } } },
        ]),

        Event.aggregate([
          { $match: { "metadata.page": { $exists: true, $ne: "" } } },
          { $group: { _id: "$metadata.page", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),

        Event.aggregate([
          { $group: { _id: "$userId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),

        Event.aggregate([
          { $match: { timestamp: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%dT%H:00:00.000Z",
                  date: "$timestamp",
                },
              },

              clicks: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "click"] }, 1, 0],
                },
              },

              views: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "view"] }, 1, 0],
                },
              },

              signups: {
                $sum: {
                  $cond: [{ $eq: ["$eventType", "signup"] }, 1, 0],
                },
              },

              total: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    const counts = {
      click: 0,
      view: 0,
      signup: 0,
    };

    for (const item of eventCounts) {
      if (item._id in counts) {
        counts[item._id] = item.count;
      }
    }

    const signupRate =
      uniqueUsers.length === 0
        ? 0
        : (counts.signup / uniqueUsers.length) * 100;

    const viewToSignupRate =
      counts.view === 0
        ? 0
        : (counts.signup / counts.view) * 100;

    // Create a complete timeline with zero-filled hours
    const timelineMap = new Map(
      timeline.map((item) => [item._id, item])
    );

    const currentHour = new Date();
    currentHour.setUTCMinutes(0, 0, 0);

    const timelineSeries = [];

    for (let i = hours - 1; i >= 0; i--) {
      const hour = new Date(currentHour);

      hour.setUTCHours(
        currentHour.getUTCHours() - i
      );

      const key = hour.toISOString();
      const item = timelineMap.get(key);

      timelineSeries.push({
        time: key,
        clicks: item?.clicks ?? 0,
        views: item?.views ?? 0,
        signups: item?.signups ?? 0,
        total: item?.total ?? 0,
      });
    }

    res.json({
      success: true,

      analytics: {
        uniqueUsers: uniqueUsers.length,

        signupRate: Number(
          signupRate.toFixed(2)
        ),

        viewToSignupRate: Number(
          viewToSignupRate.toFixed(2)
        ),

        topPages: topPages.map((item) => ({
          page: item._id,
          count: item.count,
        })),

        topUsers: topUsers.map((item) => ({
          userId: item._id,
          count: item.count,
        })),

        timeline: timelineSeries,
      },
    });
  } catch (error) {
    console.error(
      "❌ Error fetching analytics:",
      error
    );

    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
    });
  }
});

export default router;