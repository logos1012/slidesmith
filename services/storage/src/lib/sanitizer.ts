// sanitizer.ts — single source of truth for vendor-word redaction.
// Cycle 3 Fix L1: prior to extraction, server.ts and seed-service.ts each held
// their own copy of the regex and they had drifted (server.ts 11 words, seed
// 10 — `amazonaws` was missing in seed). Drift mattered because the seed
// failure report bypasses server.ts onError (it ships in a 201 body, not a 5xx)
// so a leaking word like `slidesmith.s3.amazonaws.com timeout` would only get
// caught by one of the two paths. Extracting the regex enforces the contract
// in one place and lets both paths import it.
//
// Word list mirrors the storage-ci.yml vendor-leak grep (14 patterns) so any
// new vendor we add has exactly one place to update.

const VENDOR_WORD_RE =
  /\b(Airtable|AWS|S3|Puppeteer|Gemini|Claude|Anthropic|OpenAI|Bedrock|Vertex|amazonaws)\b/gi;

/**
 * Replace vendor identifiers with the neutral word "upstream".
 * Use at every HTTP response boundary that may carry an upstream error message.
 */
export function sanitiseUpstream(msg: string): string {
  return msg.replace(VENDOR_WORD_RE, 'upstream');
}
