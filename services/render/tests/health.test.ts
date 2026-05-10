// /health route — mocks browser-pool so the test never launches Chromium.
import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock BEFORE importing app/router so the route picks up the mocks.
vi.mock("../src/services/browser-pool.js", () => ({
  probeChromium: vi.fn(),
  getPoolStats: vi.fn(),
  closeBrowser: vi.fn(),
}));

import { createApp } from "../src/server.js";
import {
  getPoolStats,
  probeChromium,
} from "../src/services/browser-pool.js";

describe("GET /health", () => {
  beforeEach(() => {
    vi.mocked(probeChromium).mockReset();
    vi.mocked(getPoolStats).mockReset();
  });

  it("returns 200 + status:ok when chromium is available", async () => {
    vi.mocked(probeChromium).mockResolvedValue({
      available: true,
      version: "HeadlessChrome/131.0.0.0",
    });
    vi.mocked(getPoolStats).mockReturnValue({ active: 0, idle: 1 });

    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "slidesmith-render",
      chromium: { available: true, version: "HeadlessChrome/131.0.0.0" },
      browserPool: { active: 0, idle: 1 },
    });
    expect(res.body.uptimeSec).toBeGreaterThanOrEqual(0);
  });

  it("returns 200 + status:degraded when chromium probe fails", async () => {
    vi.mocked(probeChromium).mockResolvedValue({
      available: false,
      version: null,
    });
    vi.mocked(getPoolStats).mockReturnValue({ active: 0, idle: 0 });

    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("degraded");
    expect(res.body.chromium.available).toBe(false);
  });
});
