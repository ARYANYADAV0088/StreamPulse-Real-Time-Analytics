import {
  describe,
  test,
  expect,
  beforeEach,
  jest,
} from "@jest/globals";

import { StatsService } from "../../services/stats-service.js";

describe("StatsService", () => {
  let service;

  beforeEach(() => {
    service = new StatsService();
  });

  test("starts with zero counters", () => {
    expect(service.getCurrentStats()).toMatchObject({
      clicks: 0,
      views: 0,
      signups: 0,
      total: 0,
    });
  });

  test("updates all event types", () => {
    service.updateStats("click");
    service.updateStats("click");
    service.updateStats("view");
    service.updateStats("signup");

    expect(service.getCurrentStats()).toMatchObject({
      clicks: 2,
      views: 1,
      signups: 1,
      total: 4,
    });
  });

  test("ignores unknown event types", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    service.updateStats("purchase");

    expect(service.getCurrentStats().total).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test("calculates percentages", () => {
    service.updateStats("click");
    service.updateStats("click");
    service.updateStats("view");
    service.updateStats("signup");

    expect(service.getStatsPercentages()).toEqual({
      clicksPercent: 50,
      viewsPercent: 25,
      signupsPercent: 25,
    });
  });

  test("resets statistics", () => {
    service.updateStats("click");
    service.updateStats("signup");
    service.resetStats();

    expect(service.getCurrentStats()).toMatchObject({
      clicks: 0,
      views: 0,
      signups: 0,
      total: 0,
    });
  });
});
