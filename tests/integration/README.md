# Integration E2E (Phase 6 Build)

> 4 서비스 (web/llm/render/storage) docker compose 통합 cross-service E2E.

## 실행

```bash
cd /Users/jake/Documents/캐러셀/slidesmith
cp .env.example .env  # CI dummy keys OK — 외부 호출 401/503 정합 박제
docker compose up -d
# Wait for 4/4 healthy (~30~50s on M2 8GB)

# Run all 3 specs (Node ≥18 native test runner, no extra deps)
node --test tests/integration/00-cold-start.test.mjs
node --test tests/integration/01-end-to-end-onboard.test.mjs
node --test tests/integration/02-saga-recover-cross-service.test.mjs

docker compose down
```

## Spec 매트릭스

| # | Spec | 박제 대상 | CI dummy keys 결과 |
|---|---|---|---|
| 00 | cold-start | 4 서비스 healthy + 9-light shape | 4/4 ok (internal) + external unknown |
| 01 | end-to-end-onboard | seed/templates/knowledge/save Saga | 207 partial (외부 키 미주입) |
| 02 | saga-recover-cross-service | 5x concurrent 동일 idempotencyKey + retry + compensation | 1 saga / 동일 retryToken |

## 환경변수

| 변수 | 기본값 | 의미 |
|---|---|---|
| `E2E_BASE_URL` | `http://localhost:3000` | web BFF URL |
| `LLM_BASE_URL` | `http://localhost:3001` | llm 직접 |
| `RENDER_BASE_URL` | `http://localhost:3002` | render 직접 |
| `STORAGE_BASE_URL` | `http://localhost:3003` | storage 직접 |

## CI 통합

`.github/workflows/integration-ci.yml`이 자동으로 4 서비스 docker compose up + 3 spec 실행 + cold start 시간 측정.
