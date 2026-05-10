# slidesmith-storage

Knowledge / Templates / Carousels / Elements R/CRUD + S3 client + Airtable client + Vendor Encapsulation Layer.

> Cycle 1 = Foundation. CRUD endpoints land in Cycle 2.

## Quickstart (4 lines)

```bash
cp ../../.env.example ../../.env       # fill in AIRTABLE_PAT + AWS_*
pnpm install
pnpm dev                                # listens on :3003
curl -s http://localhost:3003/health | jq .
```

Or via Docker Compose from repo root:

```bash
docker compose up slidesmith-storage
```

## Environment variables

See `services/storage/src/lib/env.ts` (Zod schema is the single source of truth).

| Var | Required | Notes |
|---|---|---|
| `AIRTABLE_PAT` | yes | Personal Access Token |
| `AIRTABLE_BASE_ID` | yes | Slidesmith base |
| `AWS_ACCESS_KEY_ID` | yes | IAM minimum: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on bucket only |
| `AWS_SECRET_ACCESS_KEY` | yes | |
| `AWS_S3_BUCKET` | yes | `slidesmith-carousel` |
| `AWS_S3_REGION` | yes | `ap-northeast-2` |
| `LOG_LEVEL` | no | `debug` / `info` / `warn` / `error` (default `info`) |
| `PORT` | no | default `3003` |

Anthropic / Gemini keys are **not** read here — those belong to `slidesmith-llm`.

## Architecture (Cycle 1)

```
src/
├── server.ts                  # Hono app + healthcheck + SIGTERM
├── routes/
│   ├── health.ts              # GET /health (200 always)
│   ├── knowledge.ts           # GET (stub) / POST (501 Cycle 2)
│   ├── templates.ts           # skeleton
│   ├── carousels.ts           # skeleton
│   ├── elements.ts            # skeleton
│   └── blob.ts                # skeleton
├── services/
│   └── knowledge.service.ts   # stub (Cycle 2 wires AirtableKnowledgeRepo)
├── lib/
│   ├── env.ts                 # Zod env loader (no direct process.env elsewhere)
│   ├── logger.ts              # pino + redact (Airtable PAT, AWS keys)
│   ├── airtable-client.ts     # fetch wrapper + Circuit breaker (opossum)
│   ├── airtable-cache.ts      # LRU 5-min TTL, hit/miss metrics
│   ├── failure-boundary.ts    # Bulkhead 5 (Airtable) / 8 (S3) via p-limit
│   ├── s3-client.ts           # AWS SDK v3 + signed URL helper
│   ├── vendor-mapper.ts       # AirtableRecord → domain (vendor isolation)
│   └── idempotency.ts         # 24h LRU
└── types/
    ├── airtable.ts            # vendor types — internal only
    └── domain.ts              # public domain types (vendor-neutral)
```

## Vendor encapsulation rule

API responses must NOT contain words like `airtableRecordId`, `s3Url`, `s3Bucket`. Use `recordId`, `assetUrl`, `content`. CI step `scripts/openapi-vendor-check.sh` enforces this. The single mapping point lives in `src/lib/vendor-mapper.ts`.

## Failure boundaries

| External | Bulkhead | Circuit breaker | Timeout | Fallback |
|---|---|---|---|---|
| Airtable | 5 | 50% fail / 30s open | 10s | LRU stale 5 min |
| AWS S3 | 8 | (Cycle 2) | 30s | (Cycle 2) user notice |

## Commands

```bash
pnpm dev          # tsx watch :3003
pnpm build        # tsc → dist/
pnpm typecheck    # noEmit
pnpm test         # vitest
pnpm lint         # eslint src tests
```

## Acceptance — Cycle 1

- [x] `docker compose up slidesmith-storage` reachable
- [x] `GET /health` → 200 with `airtable.available`, `s3.bucketAccessible`, `cache`
- [x] Airtable client + S3 client initialize (lazy probes, never crash boot)
- [x] `vendor-mapper` unit tests pass
- [x] CI green (typecheck + tests)

## Decision log

- **Hono 4 over Express** — already chosen by SERVICE-storage SPEC §1; matches `slidesmith-llm` runtime.
- **opossum for circuit breaker** — battle-tested, supports rolling windows; matches SPEC §7.
- **LRU memory for idempotency, not Redis** — storage is stateless by ARCH §3.6; web BFF Saga keeps the authoritative ledger in `sagas.sqlite`.
- **`probeBucket()` cached 30s** — `HeadBucket` is cheap but `/health` is hit every 10s by Docker; 30s cache prevents noisy S3 calls without masking outages.
- **`/health` returns 200 even when `degraded`** — health endpoints answer status, they don't *be* the status. Docker healthcheck reads body field; orchestrator decides.

## Troubleshooting

- **`Invalid environment` on boot** — env.ts placeholders allow boot in dev, but Airtable calls will 401. Set real values in `.env`.
- **`/health` shows `bucketAccessible: false`** — IAM must include `s3:HeadBucket` (or `s3:ListBucket`); otherwise probe fails even when reads/writes work.
- **Circuit open and not recovering** — wait 30s (resetTimeout); breaker auto half-opens. Force-close in tests via `_resetBreaker()`.
