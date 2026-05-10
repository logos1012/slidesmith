// GET /health — SPEC §5-1.
// Returns 200 with chromium probe + browser pool stats. Lazy launches Chromium
// on the first call so docker compose `start_period` covers cold start.
import { Router, type Request, type Response } from "express";
import { getPoolStats, probeChromium } from "../services/browser-pool.js";

const startedAt = Date.now();

export const healthRouter: Router = Router();

healthRouter.get("/health", async (_req: Request, res: Response) => {
  const chromium = await probeChromium();
  const browserPool = getPoolStats();
  res.status(200).json({
    status: chromium.available ? "ok" : "degraded",
    service: "slidesmith-render",
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    chromium,
    browserPool,
  });
});
