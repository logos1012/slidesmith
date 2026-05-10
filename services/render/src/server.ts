// Express server bootstrap. Single source of truth for process lifecycle.
import compression from "compression";
import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import { closeBrowser } from "./services/browser-pool.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { healthRouter } from "./routes/health.js";
import { previewRouter } from "./routes/preview.js";
import { renderRouter } from "./routes/render.js";

export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: true }));
  app.use(compression());
  // Cycle 2 Fix R5 — bumped to 16mb so the per-slide 512KB cap × 20 slides
  // (~10MB) plus base64/JSON overhead stays under the body cap. The Zod
  // schema enforces the per-slide ceiling; this is the outer envelope.
  app.use(express.json({ limit: "16mb" }));
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, "http_request");
    next();
  });

  app.use(healthRouter);
  app.use(renderRouter);
  app.use(previewRouter);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "NotFound" });
  });

  // Error handler — keep stack out of body, log full detail.
  // Cycle 2 Fix R5 — translate body-parser size errors into 413 with a
  // useful message so callers can react (the previous opaque 500 routed
  // body-too-large bugs to the wrong dashboard).
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    const errWithFlags = err as Error & { type?: string; statusCode?: number };
    if (
      errWithFlags.type === "entity.too.large" ||
      errWithFlags.statusCode === 413
    ) {
      logger.warn({ err }, "payload_too_large");
      return res.status(413).json({
        error: "PayloadTooLarge",
        message: "Request body exceeds the 16MB cap.",
      });
    }
    logger.error({ err }, "unhandled_error");
    res.status(500).json({ error: "InternalServerError" });
  });

  return app;
}

// Only boot when invoked directly (not under vitest).
const isMain =
  process.argv[1] && import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, nodeEnv: env.NODE_ENV }, "render_listening");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutdown_start");
    server.close(async () => {
      await closeBrowser();
      logger.info("shutdown_done");
      process.exit(0);
    });
    // Hard exit if cleanup hangs longer than 10s.
    setTimeout(() => {
      logger.warn("shutdown_force_exit");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
