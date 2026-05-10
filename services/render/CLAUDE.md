# CLAUDE.md — slidesmith-render

Service-local guidance for AI assistants editing this package. Read alongside
`docs/services/SERVICE-render.md` (the contract) and `docs/ARCH-v3.md` §3.6,
§7-2, §8.

## Mission per cycle

| Cycle | Scope |
|---|---|
| **1 — Foundation (this code)** | Dockerfile, Express skeleton, `/health`, browser-pool lazy launch, route stubs. **No real rendering.** |
| 2 — Core | Full `/render` pipeline (Puppeteer → Sharp → Archiver), `/preview` LRU cache, watermark, PDF合本. |
| 3 — Integration | Korean font fidelity, image-slot S3 fetch, p99 ≤ 90s, end-to-end with web. |

Treat Cycle 1 PRs as load-bearing for the rest. Don't smuggle Cycle 2/3 work in.

## Hard rules

1. **`process.env` is read in exactly one file:** `src/lib/env.ts`. Everything
   else imports `env`. ESLint enforces this.
2. **One Chromium instance.** `BROWSER_POOL_SIZE=1` is the bulkhead from
   SPEC §7 + ARCH §8 row #5. Don't add a second pool — solve concurrency by
   queueing inside `withBrowser()`.
3. **`SIGTERM` cleanup lives in `src/server.ts` only.** `browser-pool.ts`
   exposes `closeBrowser()`; the server is the single owner of process
   lifecycle. Adding `process.on(...)` elsewhere causes double-close races.
4. **Tests must mock `browser-pool`.** No vitest run is allowed to launch a
   real Chromium — CI doesn't have one and local runs would be flaky.
5. **No secrets.** This service has zero external API keys. If a future
   feature needs one, route it through `env.ts` and add a redact path in
   `logger.ts`.
6. **50-line rule.** Each PR keeps logical edits ≤ 50 lines per file
   wherever possible. wrapSlideHtml will grow in Cycle 2 — split it then.

## Common commands

```bash
pnpm install
pnpm dev          # tsx watch — needs PUPPETEER_EXECUTABLE_PATH set
pnpm typecheck
pnpm lint
pnpm test
pnpm build && pnpm start
```

## File map

- `src/server.ts` — Express + SIGTERM. Don't put routes here.
- `src/routes/*` — one file per HTTP route. Validate with Zod, return.
- `src/services/browser-pool.ts` — Puppeteer lifecycle. **Source of truth
  for "is Chromium up."**
- `src/services/render.service.ts` — Cycle 2's home for orchestration.
- `src/lib/slide-html.ts` — `wrapSlideHtml`. Brand DSL knobs land here in
  Cycle 2.
- `src/lib/failure-boundary.ts` — opossum stub. Wire into render.service in
  Cycle 2.

## What "done" looks like for Cycle 1

- `docker compose up slidesmith-render` reaches `healthy` within 30s.
- `curl localhost:3002/health` returns `{status:"ok", chromium:{available:true,...}}`.
- `pnpm typecheck` and `pnpm test` are both green.
- No file in `src/` reads `process.env` except `env.ts`.
