# slidesmith-llm

> Claude CLI subprocess + Anthropic SDK fallback + Gemini Python (v1.0 후반) + SSE.
> SPEC: `docs/services/SERVICE-llm.md`.

## Quickstart

```bash
pnpm install
cp ../../.env.example ../../.env   # ANTHROPIC_API_KEY 채우기 (Cycle 2부터 필요)
pnpm dev                           # tsx watch, http://localhost:3001
curl http://localhost:3001/health
```

Docker:
```bash
docker compose up slidesmith-llm
```

## Environment

| 변수 | 필수 | 의미 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Cycle 2부터 | Anthropic SDK fallback |
| `CLAUDE_CLI_PATH` | optional | Claude CLI 자동 감지 실패 시 override |
| `GEMINI_API_KEY` | optional (v1.0 후반) | Google Gemini 이미지 |
| `LOG_LEVEL` | optional | `debug`/`info`/`warn`/`error` (default `info`) |
| `PORT` | optional | default `3001` |

읽기는 `src/lib/env.ts` 단일 진입점 (Zod 검증). `process.env` 직접 접근은 ESLint로 금지.

## Architecture (Cycle 1 시점)

```
src/
├── server.ts          # Hono app + SIGTERM graceful shutdown
├── routes/
│   ├── health.ts      # GET /health (Cycle 1 정식)
│   └── chat.ts        # POST /chat/stream SSE (Cycle 1 skeleton)
├── services/
│   └── claude.service.ts   # Cycle 1 stub (real streamClaude → Cycle 2)
├── lib/
│   ├── claude-pool.ts # p-limit(1) + lazy CLI detect
│   ├── env.ts         # Zod env validator (sole process.env reader)
│   ├── logger.ts      # pino + secret redact
│   └── sse-stream.ts  # SSE writer helper
└── scripts/
    └── generate_image.py  # Gemini Python skeleton
```

## Cycles

| Cycle | 범위 | 상태 |
|---|---|---|
| 1 — Foundation | `/health` 200 + Claude pool 1개 + SSE skeleton + Docker boot | this PR |
| 2 — Core | 6 endpoint 정식 (chat/content/caption/moderation/image) + failure boundary | TBD |
| 3 — Integration | 실제 Anthropic / Gemini 호출 + web 통합 E2E | TBD |

## Troubleshooting

- **`/health`는 200인데 `claude.available: false`** — 로컬에 Claude CLI 미설치.
  `npm i -g @anthropic-ai/claude-code` 또는 `CLAUDE_CLI_PATH` 지정.
- **`pnpm dev`에서 env 에러** — `.env`에 `LOG_LEVEL`이 `info|warn|error|debug` 이외인 경우.
- **Docker healthcheck 실패** — 컨테이너 안에서 `wget -qO- http://localhost:3001/health`.

## Decision log

- **Hono over Express**: Web Standard `Request`/`Response` → SSE 가 native, edge 이식성.
- **`p-limit(1)` for Claude CLI**: Anthropic rate limit 보호 + Mac mini 1 core 부하.
  `opossum` Circuit Breaker는 Cycle 2에서 결합.
- **Python sidecar (Gemini)**: `google-genai` Python SDK가 가장 mature. Node SDK가 따라잡으면 dropable.
- **`process.env` 봉쇄**: `src/lib/env.ts`만 읽고, ESLint `no-restricted-properties`로 강제. 12-Factor #3.
