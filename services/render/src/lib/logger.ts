// Structured logger. JSON to stdout (12-Factor #11). Redacts secrets even though
// this service has none today — defensive baseline so Cycle 2/3 cannot leak.
import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "slidesmith-render" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.apiKey",
      "*.secret",
      "*.token",
      "brandDSL.fonts.licenseKey",
      // Cycle 3 Fix R2 — belt-and-suspenders. image-fetch already pre-shapes
      // its log fields to `{host,pathPrefix}`, but a future contributor passing
      // a raw URL into a logger.* call must not leak signed query strings.
      "*.url",
      "*.signedUrl",
      "*.presignedUrl",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;
