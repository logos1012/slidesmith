# CLAUDE.md — slidesmith-storage

> Service-scoped instructions. Read alongside repo-root `CLAUDE.md` and `docs/services/SERVICE-storage.md`.

## Service identity

- **Container**: `slidesmith-storage`
- **Port**: 3003 (internal only — only `slidesmith-web` calls us)
- **Framework**: Hono 4 + Node 20 + TypeScript 5
- **Bounded Contexts**: Knowledge / Templates / Carousels (R/CRUD) / Elements
- **External**: Airtable API + AWS S3 (the ONLY service that talks to either)

## Hard rules (non-negotiable)

1. **No `process.env` outside `src/lib/env.ts`.** Always go through `loadEnv()`.
2. **No vendor words in HTTP responses.** `airtableRecordId`, `s3Url`, `s3Bucket`, `geminiResponse`, `claudeMessage` are forbidden. Use `recordId`, `assetUrl`, `content`. CI grep enforces this.
3. **`AirtableRecord<*>` types stay inside `src/repositories/` and `src/lib/vendor-mapper.ts`.** Routes/services never import from `src/types/airtable.ts`.
4. **No `console.*` (except warn/error).** Use `logger` from `src/lib/logger.ts`. Logger redacts Airtable PAT + AWS keys.
5. **Stateless.** Storage container restart loses no data — S3 + Airtable + LRU caches only. The Saga ledger lives in `slidesmith-web`'s sqlite, not here.
6. **External call goes through a boundary.** Airtable via `airtableFetch()` (Bulkhead 5 + CB). S3 via `s3Limit()` (Bulkhead 8). Never call raw `fetch` to Airtable or raw `s3.send` outside `lib/s3-client.ts`.
7. **Idempotency for write endpoints.** `POST /carousels` and `POST /blob/upload` require `idempotencyKey`. 24h LRU.

## Cycle map

| Cycle | Scope |
|---|---|
| 1 | Foundation — Dockerfile, server, /health, lib/* clients, vendor-mapper, route skeletons |
| **2 (current)** | 5 domain CRUD endpoints + Repository interfaces + Airtable/S3 adapters + idempotency wired + vendor-leak gate |
| 3 | Real Airtable + S3 (sandbox), 51-seed import < 30s, cursor pagination 1000+ |

## File-level conventions

- All comments **English only** (root CLAUDE.md rule).
- TypeScript strict + `noUncheckedIndexedAccess`. Keep types explicit, no `any`.
- 50-line rule (sw-engineering principle 2): if a function exceeds ~50 lines, split.
- Rule of Three: don't extract a helper until the third copy.

## Commands (cheat sheet)

```bash
pnpm dev          # local dev (no Docker)
pnpm typecheck    # must be 0 errors before commit
pnpm test         # vitest
pnpm lint         # eslint
docker compose up slidesmith-storage  # repo root
```

## Failure-boundary cheat sheet

| External | Limit | CB | Timeout | Fallback |
|---|---|---|---|---|
| Airtable | p-limit(5) | opossum 50%/30s | 10s | LRU stale 5 min |
| AWS S3 | p-limit(8) | opossum 50%/60s (vol≥5) | 30s | last-checked cached 30s |

## Repository / DI architecture (Cycle 2)

Routes import `getRepos()` from `src/repositories/container.ts`. The container
returns 5 typed interfaces — `IKnowledgeRepo`, `ITemplateRepo`, `ICarouselRepo`,
`IElementRepo`, `IBlobStorage`. Production wires the Airtable + S3 adapters;
tests call `setRepos({ ... })` with in-memory fakes from `tests/fakes/`.

ESLint enforces this: routes may NOT import vendor types, vendor clients, or
concrete `AirtableXxxRepo` / `S3BlobStorage` files. Mapper + encoder
(`lib/vendor-mapper.ts` + `repositories/airtable/airtable-encode.ts`) are the
only crossings.

## Things that bit us before (don't repeat)

- **Direct `process.env` access** — silently boots with `undefined` keys, then 401s deep in a request handler. Always `loadEnv()`.
- **Caching POST responses** — `airtableFetch` only caches `GET`. Don't add POST paths to the cache.
- **Forgetting the breaker** — bypassing `airtableFetch` to "just hit the API once" defeats the whole boundary. Use the helper.
- **Vendor words leaking** — adding `airtableRecordId` to a response field "just for debugging" trips CI and exposes vendor identity. Use `recordId`.

## Pre-PR checklist

- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` green
- [ ] No `process.env` outside `env.ts`
- [ ] No vendor words in route handlers (`grep -rE 'airtable|s3Url|s3Bucket' src/routes/` returns nothing)
- [ ] New external call wrapped by `airtableFetch` or `s3Limit`
