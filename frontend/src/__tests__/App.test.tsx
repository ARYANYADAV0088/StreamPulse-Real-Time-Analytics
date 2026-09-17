import { describe, test, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

jest.unstable_mockModule("axios", () => ({
  default: {
    get: jest.fn().mockImplementation((url: string) => {
      if (url.includes("/analytics")) {
        return Promise.resolve({
          data: {
            success: true,
            analytics: {
              uniqueUsers: 12,
              signupRate: 25,
              viewToSignupRate: 10,
              topPages: [{ page: "/home", count: 10 }],
              topUsers: [{ userId: "user-1", count: 3 }],
              timeline: [],
            },
          },
        });
      }

      if (url.includes("/streaming")) {
        return Promise.resolve({
          data: {
            success: true,
            streaming: {
              broker: {
                status: "healthy",
                port: 9090,
                partitionCount: 3,
                topics: {},
                consumerGroups: [],
              },
            },
          },
        });
      }

      return Promise.resolve({
        data: {
          success: true,
          events: [],
          pagination: { page: 1, totalPages: 1, total: 0 },
        },
      });
    }),
    post: jest.fn().mockResolvedValue({
      data: { success: true, count: 10, durationMs: 2 },
    }),
  },
}));

jest.unstable_mockModule("socket.io-client", () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

const { default: App } = await import("../App");

describe("StreamPulse dashboard", () => {
  test("renders the main navigation", async () => {
    render(<App />);

    expect(screen.getByText("StreamPulse")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Event Explorer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Streaming System/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Architecture/i })).toBeInTheDocument();
  });
});
