# CLAUDE.md — slidesmith-llm service

> Service-local guidance. Repo-wide rules live in `slidesmith/CLAUDE.md` (TBD).

## Hard rules (Cycle 1+)

1. **Never read `process.env` outside `src/lib/env.ts`.** ESLint enforces it. All
   new config must be added to the Zod schema there.
2. **Never log secrets.** `src/lib/logger.ts` redacts `*.api_key`, `*.apiKey`,
   `*.ANTHROPIC_API_KEY`, `*.GEMINI_API_KEY`, and `req.headers.authorization`.
   When adding fields, add their paths to the redact list before merging.
3. **Bulkhead first, then call.** All Anthropic / Gemini outbound traffic must
   pass through `withClaudeSlot()` (or the Cycle 2 `withGeminiBoundary`).
   `p-limit(1)` for Claude is non-negotiable until v1.5 distributed semaphore.
4. **No vendor terms in HTTP boundary.** Inside this service `claudeMessage`,
   `geminiResponse` are fine. At the HTTP boundary use `content`, `text`, `usage`.
   ARCH §6 vendor-leak CI gate enforces this.
5. **50-line rule.** Keep responses, modules, and PRs small. Files in `src/`
   should stay under ~80 lines unless logically indivisible.

## Cycle scope

- **Cycle 1 (this commit)**: `/health` 200, Claude CLI lazy detection, SSE
  skeleton on `/chat/stream`, Docker boot. No real Anthropic / Gemini call.
- **Cycle 2**: `streamClaude` (CLI subprocess + stream-json parser + opossum
  Circuit Breaker), Anthropic SDK fallback, `/content/generate`,
  `/caption/generate`, `/moderation/check`, prompt-builder, failure-boundary.
- **Cycle 3**: real Anthropic + Gemini API, web integration E2E, `/image/generate`.

## Adding a new endpoint

1. Define request/response types in `src/types/` (Zod first).
2. Add a route file under `src/routes/`. Register it in `src/server.ts`.
3. Mock-friendly service in `src/services/` (no fetch in routes).
4. Outbound calls always go through a `lib/*-boundary.ts` (Cycle 2+).
5. Unit test in `tests/` (Vitest, node env).

## Verification

```bash
pnpm typecheck
pnpm test
pnpm lint
docker compose build slidesmith-llm
```

Cycle acceptance lives in `docs/services/SERVICE-llm.md §12`.
