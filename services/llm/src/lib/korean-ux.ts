// src/lib/korean-ux.ts — Phase 6 contract pinning (Cycle 3 Fix F1).
//
// Single funnel that EVERY error-emitting endpoint MUST go through. New
// endpoints added in Phase 6+ inherit the 4-원칙 (What/Why/Next/Recovery)
// shape automatically by calling `respondWithKoreanError(c, err, what)` —
// no per-route boilerplate, no risk of forgetting the userMessage field.
//
// Contract guaranteed by this module (Phase 6 web-BFF dependency):
//   - response body shape: { error: ErrorCode, userMessage: KoreanUserMessage }
//   - HTTP status:         429 (rate_limited) | 502 (server/network/unknown) | 503 (auth/CB/no_backend)
//   - errorCode catalog:   UNAUTHORIZED / RATE_LIMITED / SERVER_ERROR / CIRCUIT_OPEN
//                          NO_LLM_BACKEND / NETWORK_ERROR / <fallback>
//   - userMessage: { what, why, next, recovery } — all Hangul-bearing strings.

import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  classifyError,
  mapErrorToKoreanUserMessage,
  statusCodeFor,
  type ErrorClass,
  type KoreanUserMessage,
} from './sanitize-error.js';

/** Canonical errorCode for an ErrorClass. Routes pass a fallback for unknown. */
export function errorCodeFor(cls: ErrorClass, fallback = 'INTERNAL_ERROR'): string {
  switch (cls) {
    case 'unauthorized': return 'UNAUTHORIZED';
    case 'rate_limited': return 'RATE_LIMITED';
    case 'circuit_open': return 'CIRCUIT_OPEN';
    case 'no_backend':   return 'NO_LLM_BACKEND';
    case 'network':      return 'NETWORK_ERROR';
    case 'server_error': return 'SERVER_ERROR';
    default:             return fallback;
  }
}

/** Single-line response body the BFF/web layer can consume uniformly. */
export interface KoreanErrorBody {
  error: string;
  userMessage: KoreanUserMessage;
  message?: string;
}

/**
 * Build the canonical Korean error body. Pure — no Hono coupling so it can be
 * reused inside SSE error frames as well as JSON responses.
 */
export function buildKoreanErrorBody(
  err: unknown,
  what: string,
  fallbackCode = 'INTERNAL_ERROR',
): { body: KoreanErrorBody; status: 429 | 502 | 503; cls: ErrorClass } {
  const cls = classifyError(err);
  const um = mapErrorToKoreanUserMessage(err, { what });
  const body: KoreanErrorBody = {
    error: errorCodeFor(cls, fallbackCode),
    userMessage: { what: um.what, why: um.why, next: um.next, recovery: um.recovery },
  };
  return { body, status: statusCodeFor(cls), cls };
}

/** Hono helper — every catch block in a JSON route MUST call this. */
export function respondWithKoreanError(
  c: Context,
  err: unknown,
  what: string,
  fallbackCode = 'INTERNAL_ERROR',
  extra?: Record<string, unknown>,
): Response {
  const { body, status } = buildKoreanErrorBody(err, what, fallbackCode);
  return c.json({ ...body, ...(extra ?? {}) }, status as ContentfulStatusCode);
}
