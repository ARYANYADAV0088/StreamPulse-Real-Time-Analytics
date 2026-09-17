import { Event } from "../models/Event.js";

export class StatsService {
  constructor() {
    this.stats = {
      clicks: 0,
      views: 0,
      signups: 0,
      total: 0,
      lastUpdated: new Date().toISOString(),
    };
    this.processedSinceStart = 0;
    this.startedAt = Date.now();
  }

  updateStats(eventType) {
    const key = `${eventType}s`;
    if (!["clicks", "views", "signups"].includes(key)) {
      console.warn(`Unknown event type: ${eventType}`);
      return;
    }

    this.stats[key] += 1;
    this.stats.total =
      this.stats.clicks + this.stats.views + this.stats.signups;
    this.stats.lastUpdated = new Date().toISOString();
    this.processedSinceStart += 1;
  }

  async loadStatsFromDatabase() {
    const [clicks, views, signups] = await Promise.all([
      Event.countDocuments({ eventType: "click" }),
      Event.countDocuments({ eventType: "view" }),
      Event.countDocuments({ eventType: "signup" }),
    ]);

    this.stats = {
      clicks,
      views,
      signups,
      total: clicks + views + signups,
      lastUpdated: new Date().toISOString(),
    };
  }

  getCurrentStats() {
    return {
      ...this.stats,
      processedSinceStart: this.processedSinceStart,
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  resetStats() {
    this.stats = {
      clicks: 0,
      views: 0,
      signups: 0,
      total: 0,
      lastUpdated: new Date().toISOString(),
    };
    this.processedSinceStart = 0;
  }

  getStatsPercentages() {
    if (!this.stats.total) {
      return { clicksPercent: 0, viewsPercent: 0, signupsPercent: 0 };
    }

    return {
      clicksPercent: Math.round((this.stats.clicks / this.stats.total) * 100),
      viewsPercent: Math.round((this.stats.views / this.stats.total) * 100),
      signupsPercent: Math.round((this.stats.signups / this.stats.total) * 100),
    };
  }
}
