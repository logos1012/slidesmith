# slidesmith-render

Slide → PNG/PDF render service for Slidesmith. Headless Chromium (Puppeteer) +
Sharp + Archiver. Zero external API calls.

| | |
|---|---|
| Container | `slidesmith-render` |
| Port | `3002` (internal, exposed in dev only) |
| Memory limit | 1,536 MB |
| Spec | [`docs/services/SERVICE-render.md`](../../../docs/services/SERVICE-render.md) |
| Cycle | **1 — Foundation** (this commit) |

## Quickstart

```bash
# From repo root
docker compose up slidesmith-render
curl http://localhost:3002/health
```

Local (no Docker — Chromium must already be installed):

```bash
cd services/render
pnpm install
PUPPETEER_EXECUTABLE_PATH=$(which chromium || which google-chrome) pnpm dev
```

## Environment

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3002` | HTTP listen port |
| `LOG_LEVEL` | `info` | pino log level |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium` | Set by Dockerfile |
| `RENDER_OUT_DIR` | `/tmp/render-out` | Cycle 2 ZIP scratch dir |
| `BROWSER_POOL_SIZE` | `1` | Bulkhead size (SPEC §7) |

No external API keys.

## Endpoints (Cycle 1)

| | | Cycle |
|---|---|---|
| `GET /health` | 200 + chromium probe + pool stats | **1** |
| `POST /render` | 202 accepted (validation only) | stub → **2** |
| `GET /preview/:slideId` | 501 not_implemented | stub → **2** |

## Architecture

```
src/
├── server.ts                 # Express bootstrap + SIGTERM
├── routes/
│   ├── health.ts             # GET  /health
│   ├── render.ts             # POST /render (Cycle 1: 202 stub)
│   └── preview.ts            # GET  /preview/:slideId (Cycle 1: 501 stub)
├── services/
│   ├── browser-pool.ts       # Lazy Puppeteer + p-limit(1) bulkhead
│   └── render.service.ts     # Orchestration stub (Cycle 2 fills in)
├── lib/
│   ├── env.ts                # Zod-validated env (only file allowed to read process.env)
│   ├── logger.ts             # pino + secret redaction
│   ├── slide-html.ts         # wrapSlideHtml (Cycle 1: minimal Pretendard frame)
│   └── failure-boundary.ts   # opossum circuit breaker stub (ARCH §8 row #5)
├── templates/slide-frame.html
└── types/render.types.ts
```

## Decision log

- **Why `node:20.18-bullseye-slim` + system Chromium instead of `ghcr.io/puppeteer/puppeteer`?**
  SPEC §2. Smaller surface, controlled font install (Pretendard variable woff2),
  uses `puppeteer-core` so we never download a duplicate Chromium at build time.
- **Why bulkhead size 1?** Solo PoC, single Mac mini. Two concurrent
  Chromiums would push memory beyond 1.5 GB. SPEC §7.
- **Why lazy launch?** Container start finishes in <2s; Puppeteer cold start
  amortizes into the first `/health` call (start_period covers it).
- **Why `puppeteer-core`?** Avoids the ~280 MB bundled Chromium download —
  we install Chromium via apt and point `PUPPETEER_EXECUTABLE_PATH` at it.

## Troubleshooting

- **`/health` returns `degraded`** → Chromium not installed or path wrong.
  Check `PUPPETEER_EXECUTABLE_PATH`. In Docker the path is `/usr/bin/chromium`.
- **Container OOM-killed during render** → expected with 2+ concurrent
  Chromiums. Keep `BROWSER_POOL_SIZE=1` until Mac mini RAM headroom is proven.
- **Korean text renders as boxes** → font cache cold. Inside the container
  run `fc-list | grep -i pretendard`. Dockerfile installs the variable woff2;
  rebuild if missing.

## Tests

```bash
pnpm typecheck
pnpm test            # vitest, browser-pool is mocked — never launches Chromium
```

## Cycle 1 acceptance

- [x] `docker compose up slidesmith-render` boots (~30s first start)
- [x] `GET /health` returns 200 with `chromium.available`
- [x] `pnpm typecheck` passes
- [x] Unit tests for `/health`, `/render` validation, `wrapSlideHtml`

Cycle 2 will land the real render pipeline (Sharp + Archiver + watermark + PDF).
