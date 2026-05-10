// src/lib/sanitize-error.ts — strip vendor API key prefixes from error messages
// + classify vendor errors into Korean 4-원칙 (What/Why/Next/Recovery) messages.
//
// Cycle 2 Fix P1-1: vendor API key sanitization (regex mask).
// Cycle 3 A1 + C1: extended with classifyError() + mapErrorToKoreanUserMessage()
//   so every endpoint that surfaces a vendor error speaks the same 4-message
//   shape — 401 / 429 / 5xx / circuit-open / no-backend / network / unknown.
//
// All raw error strings emitted to users (chat SSE error frame, content/image
// userMessage.why) MUST go through sanitizeErrorMessage to ensure no API key
// prefix or bearer token leaks via vendor error echoes.

const PATTERNS: ReadonlyArray<{ re: RegExp; replacement: string }> = [
  // Anthropic — sk-ant-api03-XXX, sk-ant-XXX (any future variant)
  { re: /sk-ant-[A-Za-z0-9_-]+/gi, replacement: 'sk-ant-***' },
  // Generic OpenAI-style — sk-XXX (covers sk-test-, sk-proj-, sk-or-, etc.)
  { re: /sk-(?!ant-)[A-Za-z0-9_-]{16,}/gi, replacement: 'sk-***' },
  // Google — AIza-prefixed API keys
  { re: /AIza[A-Za-z0-9_-]{20,}/g, replacement: 'AIza-***' },
  // HTTP Authorization Bearer tokens
  { re: /Bearer\s+[A-Za-z0-9._\-+=/]+/gi, replacement: 'Bearer ***' },
  // x-api-key header echoes (case-insensitive, with optional quoting)
  { re: /(x-api-key["'\s:=]+)[A-Za-z0-9._-]{12,}/gi, replacement: '$1***' },
  // Cycle 3 Fix F3 (P2-3) — additional PII patterns so the unknown-class echo
  // is safe even when the vendor body contains user identifiers.
  // Email addresses
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: '[email]' },
  // JWT (3 base64url segments separated by dots)
  { re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, replacement: '[jwt]' },
  // E.164 phone numbers (with leading + and 8-15 digits)
  { re: /\+\d{8,15}\b/g, replacement: '[phone]' },
  // Korean cell phones (010-1234-5678 / 010 1234 5678 / 01012345678)
  { re: /\b01[0-9][\s.-]?\d{3,4}[\s.-]?\d{4}\b/g, replacement: '[phone]' },
];

/** Mask any API key prefix or bearer token inside a free-form error message. */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return message;
  let out = message;
  for (const { re, replacement } of PATTERNS) {
    out = out.replace(re, replacement);
  }
  return out;
}

/** Convenience: pull message off an unknown thrown value, then sanitize. */
export function sanitizeUnknownError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return sanitizeErrorMessage(raw);
}

// ---------------------------------------------------------------------------
// Cycle 3 A1: vendor error classification + Korean 4-원칙 (C1)
// ---------------------------------------------------------------------------

export type ErrorClass =
  | 'unauthorized' // 401
  | 'rate_limited' // 429
  | 'server_error' // 500/502/503/504
  | 'circuit_open' // our breaker is open
  | 'no_backend' // neither CLI nor SDK configured
  | 'network' // connect/timeout/abort
  | 'unknown';

export interface KoreanUserMessage {
  what: string;
  why: string;
  next: string;
  recovery: string;
}

/**
 * Classify a (possibly Anthropic-SDK-shaped) error or its message string into
 * one of seven canonical buckets. Pure: takes the raw thrown value or string
 * and returns the bucket — does NOT inspect transport state.
 *
 * Recognized signals:
 *   - status: number (Anthropic.APIError shape) → 401 / 429 / 5xx
 *   - message containing "401" / "Invalid API Key" / "authentication" / "x-api-key"
 *   - message containing "429" / "rate" / "limit" / "quota"
 *   - message containing "500" / "502" / "503" / "504" / "overloaded" / "internal_server_error"
 *   - message containing "Breaker is open" → circuit_open
 *   - message containing "NO_LLM_BACKEND" → no_backend
 *   - message containing "ECONNREFUSED" / "ETIMEDOUT" / "ENOTFOUND" / "abort" → network
 */
export function classifyError(err: unknown): ErrorClass {
  // Try numeric status off SDK error shape first.
  const status = extractStatus(err);
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  if (status !== null && status >= 500 && status < 600) return 'server_error';

  const raw = err instanceof Error ? err.message : String(err);
  const m = raw.toLowerCase();

  if (m.includes('breaker is open') || m.includes('circuit_open')) return 'circuit_open';
  if (m.includes('no_llm_backend')) return 'no_backend';

  // Cycle 3 Fix F4 (P2-2): tighten text-fallback matching so HTTP-status digits
  // ("401" / "429" / "5xx") only trigger when paired with auth/limit/HTTP
  // context — never on freestanding occurrences in user-content echoes. The
  // numeric `status` field still short-circuits above (preferred path); this
  // text-fallback only runs when the SDK error has no `status` property.
  if (
    /^401\b/.test(m) ||
    /\bhttp\s*401\b/.test(m) ||
    /\bstatus[: ]+401\b/.test(m) ||
    /\b401\s+(unauthorized|forbidden)\b/.test(m) ||
    /^403\b/.test(m) ||
    /\b403\s+forbidden\b/.test(m) ||
    m.includes('invalid api key') ||
    m.includes('invalid x-api-key') ||
    /\bunauthorized\b/.test(m) ||
    m.includes('authentication_error')
  ) {
    return 'unauthorized';
  }

  if (
    /^429\b/.test(m) ||
    /\bhttp\s*429\b/.test(m) ||
    /\bstatus[: ]+429\b/.test(m) ||
    /\b429\s+(too\s+many|rate)/.test(m) ||
    m.includes('rate_limit') ||
    /\brate limit\b/.test(m) ||
    /\bquota\s+(exceed|exhaust|limit|reached)/.test(m) ||
    m.includes('too many requests')
  ) {
    return 'rate_limited';
  }

  if (
    /^5(0[0-9]|[1-9][0-9])\b/.test(m) ||
    /\bhttp\s*5\d{2}\b/.test(m) ||
    /\bstatus[: ]+5\d{2}\b/.test(m) ||
    /\b5\d{2}\s+(internal|bad\s+gateway|service|gateway)/.test(m) ||
    m.includes('overloaded') ||
    m.includes('internal_server_error') ||
    m.includes('bad gateway') ||
    m.includes('service unavailable') ||
    m.includes('gateway timeout')
  ) {
    return 'server_error';
  }

  if (
    m.includes('econnrefused') ||
    m.includes('etimedout') ||
    m.includes('enotfound') ||
    m.includes('econnreset') ||
    /\b(request|connection|operation)\s+aborted\b/.test(m) ||
    /^aborted\b/.test(m) ||
    m.includes('socket hang up')
  ) {
    return 'network';
  }

  return 'unknown';
}

function extractStatus(err: unknown): number | null {
  if (err && typeof err === 'object') {
    const candidate = err as { status?: unknown; statusCode?: unknown };
    if (typeof candidate.status === 'number') return candidate.status;
    if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  }
  return null;
}

/**
 * Cycle 3 C1 — produce a Korean 4-원칙 (What/Why/Next/Recovery) message for
 * an unknown vendor error. The "why" string is sanitized (no API key prefix
 * leaks) and human-grade short. Used by chat SSE error frame, content/image
 * userMessage. One canonical voice across every endpoint.
 *
 * Voice rules:
 *   - 사실 중심, 감정 없음 ("…입니다", "…해 주세요").
 *   - next는 사용자가 즉시 할 수 있는 행동 1가지.
 *   - recovery는 안전망 (대안 / 재시도 시점 / 데이터 보존).
 */
export function mapErrorToKoreanUserMessage(
  err: unknown,
  ctx: { what: string },
): KoreanUserMessage & { class: ErrorClass } {
  const cls = classifyError(err);
  const safeMessage = sanitizeUnknownError(err);

  switch (cls) {
    case 'unauthorized':
      return {
        class: cls,
        what: ctx.what,
        why: 'API 키가 유효하지 않거나 권한이 없습니다.',
        next: 'ANTHROPIC_API_KEY 또는 GEMINI_API_KEY 값을 확인해 다시 설정해 주세요.',
        recovery: '키 교체 후 자동으로 다시 시도됩니다. 입력 내용은 보존됩니다.',
      };
    case 'rate_limited':
      return {
        class: cls,
        what: ctx.what,
        why: '요청 한도(분당 또는 토큰)에 도달했습니다.',
        next: '약 1분 뒤 다시 시도해 주세요.',
        recovery: '한도 초과는 일시적 상태이며, 입력 내용은 그대로 유지됩니다.',
      };
    case 'server_error':
      return {
        class: cls,
        what: ctx.what,
        why: '외부 LLM 서버가 일시적으로 응답하지 못했습니다.',
        next: '잠시 후 다시 시도해 주세요. 5회 연속 실패 시 회로가 자동 차단됩니다.',
        recovery: '문제 지속 시 다른 모델 또는 직접 작성 모드로 전환할 수 있습니다.',
      };
    case 'circuit_open':
      return {
        class: cls,
        what: ctx.what,
        why: '연속 실패로 외부 호출이 일시 차단되었습니다 (회로 개방).',
        next: '약 30분 뒤 자동으로 재시도가 가능합니다.',
        recovery: '입력은 안전하게 보관되며, 회복 후 동일한 결과로 진행됩니다.',
      };
    case 'no_backend':
      return {
        class: cls,
        what: ctx.what,
        why: 'Claude CLI도, Anthropic SDK도 설정되지 않았습니다.',
        next: 'ANTHROPIC_API_KEY를 환경변수에 추가하거나 Claude CLI를 설치해 주세요.',
        recovery: '설정 완료 후 즉시 사용 가능하며, 별도 재시작은 필요 없습니다.',
      };
    case 'network':
      return {
        class: cls,
        what: ctx.what,
        why: '외부 API와의 네트워크 연결이 일시적으로 끊겼습니다.',
        next: '네트워크 상태를 확인하고 잠시 후 다시 시도해 주세요.',
        recovery: '연결 회복 시 자동으로 복구됩니다. 입력 내용은 보존됩니다.',
      };
    default: {
      // Cycle 3 Fix F3 (P2-3): vendor `safeMessage` echoes are double-sanitized
      // (sk-/AIza/Bearer + email/JWT/phone) but we still cap at 120 chars and
      // only echo when the leftover string contains no risky tokens. If the
      // sanitized payload still looks suspicious, drop it entirely — Korean
      // 4-원칙 invariant is preserved by the static lead.
      const echoSafe =
        safeMessage && safeMessage.length > 0 && !/\[(email|phone|jwt)\]/.test(safeMessage)
          ? ` (원문: ${safeMessage.slice(0, 120)})`
          : '';
      return {
        class: cls,
        what: ctx.what,
        why: `알 수 없는 오류가 발생했습니다.${echoSafe}`,
        next: '잠시 후 다시 시도해 주세요.',
        recovery: '문제가 지속되면 관리자에게 문의해 주세요. 입력 내용은 보존됩니다.',
      };
    }
  }
}

/**
 * Cycle 3: HTTP status code mapping for non-streaming endpoints.
 *   - unauthorized       → 503 (config issue, not user fault)
 *   - rate_limited       → 429 (passthrough so caller can backoff)
 *   - circuit_open       → 503
 *   - no_backend         → 503
 *   - network            → 502
 *   - server_error       → 502
 *   - unknown            → 502
 */
export function statusCodeFor(cls: ErrorClass): 429 | 502 | 503 {
  if (cls === 'rate_limited') return 429;
  if (cls === 'unauthorized' || cls === 'circuit_open' || cls === 'no_backend') return 503;
  return 502;
}
