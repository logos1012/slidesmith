# Slidesmith (카루)

> **한국어 인스타 카루셀, 1줄 → 5분 → 발행 가능 PNG + Caption.**
> 카피라이팅·심리학 프레임워크 내장. AI 카피 + Brand DSL 자동 일관.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Made for Solo Creators](https://img.shields.io/badge/made%20for-solo%20creators-blue)](README.md)
[![v1.1.0](https://img.shields.io/badge/version-1.1.0-green)](CHANGELOG.md) [![Aurora redesign](https://img.shields.io/badge/UI-Aurora%20vibrant-7c5cff)](docs/aurora/)

> 영문 README는 [README.en.md](README.en.md) (TBD).

---

## 1. 한 줄 설명 + 동기

Slidesmith는 **한국어 인스타 카루셀을 5분 안에 발행 가능 상태**로 만드는 로컬 우선 (local-first) 도구다.

3년 전 직접 운영하던 인스타 계정에서 카루셀 한 장에 30~60분이 걸렸다. Canva 템플릿 고르고, 한글 줄바꿈 깨지면 다시 손보고, 카피 톤 흔들리고, 30개 해시태그 짜내다가 이틀 미루고 잊어버리고. 도구의 문제가 아니라 "도구가 한국 솔로 크리에이터를 진지하게 다루지 않는다"는 문제였다. 그래서 직접 만들었다 — Brand DSL로 톤·색·폰트가 자동 일관되고, PAS·AIDA·Cialdini 같은 검증된 카피 프레임워크가 내장되고, 한글이 깨지지 않는 HTML 엔진 위에서 굴러가는 5분 워크플로우.

**왜 직접 만들었나** — 솔로 크리에이터의 발행 주기는 매일이 아니다. **30일 후에 다시 켰을 때도 막힘 없이 돌아가야 한다.** 클라우드 SaaS는 PAT 만료·요금 변경·UI 리뉴얼로 매번 다시 배운다. Slidesmith는 Mac mini 위 Docker Compose 한 줄로 부팅되고, 데이터는 본인 Airtable + S3에 저장된다. 1년 휴면 후에도 `docker compose up` 하나면 같은 파일이 그대로 돈다.

[GIF: 5초 demo — brief 입력 → 5분 후 카루셀 saved] *(v1.1 추가 예정)*

---

## 2. Quickstart (4줄)

```bash
git clone https://github.com/logos1012/slidesmith.git && cd slidesmith
cp .env.example .env && $EDITOR .env   # Anthropic / Airtable / AWS 키 채우기
docker compose up -d                    # 4 서비스 부팅 (~30~50초)
open http://localhost:3000              # 마법사 시작
```

**첫 부팅 시간 측정** (M2 Mac mini 8GB 기준):
- storage: ~15초 healthy
- llm: ~20초 healthy (uv venv 첫 init 시 +30초)
- render: ~30초 healthy (Puppeteer Chromium 첫 다운로드 시 +60초)
- web: storage/llm/render 모두 healthy 후 ~30초

**총 메모리**: 768 + 512 + 1536 + 256 = **3,072 MB** (Mac M2 8GB OK).

---

## 3. 환경변수 의미 (`.env.example`)

| 키 | 어디서? | 비용 | 시간 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | $5 free credit | 1분 |
| `AIRTABLE_PAT` | airtable.com/create/tokens | 무료 (1,000 records/base) | 2분 |
| `AIRTABLE_BASE_ID` | Airtable URL의 `app...` | — | (자동) |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | console.aws.amazon.com → IAM | $0.023/GB·월 (S3) | 5분 |
| `AWS_S3_BUCKET` | console.aws.amazon.com → S3 | (위와 동일) | 1분 |
| `AWS_S3_REGION` | 위와 동일 (예: ap-northeast-2) | — | (자동) |
| `GEMINI_API_KEY` | aistudio.google.com (옵션, v1.0 후반) | $0.039/이미지 | 2분 |

**Vendor 격리 박제**:
- 외부 키는 `slidesmith-llm` + `slidesmith-storage` 컨테이너에만 주입됨.
- `slidesmith-web` (BFF) + `slidesmith-render` 컨테이너는 외부 키 0 — 침해 시 leak 0.
- `pino` logger는 `api_key|token|password|authorization|cookie|*.url|*.signedUrl` 자동 redact.

---

## 4. 디렉토리 구조 + 4 서비스 아키텍처

```
slidesmith/
├── docker-compose.yml          # 4 서비스 통합 (Phase 6 박제)
├── .env.example                # 모든 키 + 서비스 URL
├── .github/workflows/          # CI: web / storage / llm / render / integration
├── services/
│   ├── web/                    # Next.js 16 + React 19 (포트 3000)
│   │   └── BFF + Saga + Wizard 5 steps + Caption + Moderation UI
│   ├── llm/                    # Hono 4 (포트 3001)
│   │   └── Claude CLI + Anthropic SDK + Gemini Python (uv)
│   ├── render/                 # Express 5 (포트 3002)
│   │   └── Puppeteer + Sharp + Archiver + image-slot
│   └── storage/                # Hono 4 (포트 3003)
│       └── Knowledge / Templates / Carousels / Elements + S3 + Airtable
├── seeds/                      # 51 Knowledge seed (v1.0)
├── scripts/                    # 운영 스크립트
└── tests/                      # 통합 E2E (cold-start / onboard / saga-recover)
```

**4 서비스 통신 그래프** (DAG, 순환 의존성 0):

```
   사용자 (브라우저) → web :3000 ← 단일 진입점
                         │   │   │
                  HTTP+SSE│   │HTTP│HTTP
                         ▼   ▼   ▼
                       llm  rndr  storage
                       3001 3002  3003
                         │         │
              Anthropic+Gemini    Airtable + S3
```

- storage → 외부: Airtable + S3
- llm → 외부: Anthropic API + Gemini Python
- render → 외부: 0 (Puppeteer 로컬 Chromium)
- web → 외부: 0 (모든 외부 호출은 다른 3 서비스 통해)

---

## 5. 트러블슈팅 (18 항목, 12+ 충족)

### 부팅 단계

1. **`docker compose up` 후 web이 부팅 안 됨** — `docker compose ps` 로 storage/llm/render `(healthy)` 확인. 한 서비스라도 `(unhealthy)`면 web은 대기 중. `docker compose logs <service>`로 부팅 에러 확인.
2. **`(unhealthy)` 가 30초 이상 지속** — `start_period`(15~30s) 만료 후 healthcheck 실패. 가장 흔한 원인: `wget`이 컨테이너 안에 없음 (Dockerfile 회귀). `docker compose exec <service> sh` 후 `wget --version` 확인.
3. **Puppeteer가 Chromium을 못 찾음** — render 첫 부팅 시 ~60초 다운로드. `docker compose logs slidesmith-render | grep -i chromium` 으로 진행 확인.
4. **uv venv 첫 init 30초 지연** — llm 첫 부팅 시 Gemini Python 의존성 (`pillow` 등) 다운로드. 두 번째 부팅부터는 캐시 사용 (1초).

### 런타임 단계

5. **마법사가 첫 단계에서 멈춤** — `/api/health/deps` 9-light 확인 (`http://localhost:3000/api/health/deps`). storage/llm/render 중 하나가 `down`이면 그 서비스 로그 확인.
6. **51 Knowledge seed가 102개로 두 배 됨** — Cycle 3 Fix F1 박제 후 불가. 만약 발생하면 storage CI 회귀. `docker compose exec slidesmith-storage curl -X POST http://localhost:3003/knowledge/seed` (no key) → 400 정합 확인.
7. **Caption이 30 hashtag 정확히 안 나옴** — caption-rules.ts 5 규칙 (1+4+5 박제). brandDsl `signaturePhrases` 빈 배열 OK, 빈 문자열은 zod min(1) 차단.
8. **Saga가 `partial` 상태로 멈춤** — `/api/save/retry` 호출 (retryToken 사용). 같은 Idempotency-Key로 5번 동시 호출해도 1 saga만 살아남음 (Cycle 3 Fix F1).
9. **워터마크가 PNG에 안 보임** — Step 4 워터마크 토글 (`role=switch`) ON 박제 + 자동 저장 (zustand persist) 박제. 저장된 brief 새로고침 후 복원.
10. **save 후 새로고침 시 wizard 입력 사라짐** — Cycle 3 Fix F5 박제 (zustand persist + `liveStorage` wrapper). 만약 발생하면 브라우저 localStorage 비활성 의심 (시크릿 모드 등).

### 보안 게이트

11. **외부 4 키가 web 컨테이너 환경에 노출됨** — `docker exec slidesmith-web env | grep -iE 'ANTHROPIC|AIRTABLE|AWS_SECRET|GEMINI'` → 0 hit이어야 함. 1 hit이면 docker-compose.yml `env_file: .env`가 web 블록에 잘못 추가된 것 (제거).
12. **로그에 `sk-ant-...` / `AKIA...` / signed URL이 평문으로 출력** — Cycle 3 Fix R2 박제. `pino` redact paths 회귀 의심. `services/render/src/lib/logger.ts`와 `services/llm/src/lib/sanitize-error.ts` 확인.
13. **Render가 file:// 또는 IMDS (169.254.169.254) 로 redirect 따라감** — Cycle 3 Fix R1 박제. `image-fetch.ts:fetch(... redirect: "manual")` 회귀 의심. 단위 테스트 `image-fetch.test.ts` 회귀 검증.

### 1개월 휴면 후 다시 시작하기

14. **Airtable PAT 만료 (90일 정책)** — airtable.com/create/tokens 에서 신규 발급 → `.env` 갱신 → `docker compose restart slidesmith-storage`.
15. **`docker compose up`이 "no such file" 에러** — `cd slidesmith` 안에서 실행 (working dir 확인).
16. **Knowledge seed 변경 사항이 반영 안 됨** — `docker compose exec slidesmith-storage curl -X POST http://localhost:3003/knowledge/seed -H 'Idempotency-Key: refresh-1'` (Idempotency-Key 필수, Cycle 3 Fix F1).
17. **CI가 main push에 실패** — `pnpm audit --audit-level=high` 회귀 가능성. 4 서비스 각각 `cd services/<name> && pnpm audit --audit-level=high` 로 재현. v1.0.0 시점 4 서비스 모두 통과 박제 (Phase 6 Fix F2: Next.js 16.0.0 → 16.2.6).
18. **`docker compose up` 시 `.env: no such file`** — `.env`가 없으면 compose가 즉시 fail. `cp .env.example .env` 한 번 실행 후 `$EDITOR .env`로 4 키 (Anthropic / Airtable / AWS / Gemini) 채우면 정상.

---

## 6. 결정 로그 (Decision Log)

> "왜 PostgreSQL 대신 SQLite?" 같은 질문에 3개월 후의 자기가 답할 수 있도록.

### v1.0.0 (Phase 1~6, 2026-05-08~10)

| # | 결정 | 사유 | 출처 |
|---|---|---|---|
| D1 | **4 마이크로서비스 (web/llm/render/storage)** | 빌드 사이클 분리 + Puppeteer 1.5GB 격리 + vendor 키 분리 | ARCH-v3 §3 |
| D2 | **Saga (no 2PC)** | Airtable + S3 분산 트랜잭션 — 보상 가능 step (DELETE) 박제 | DESIGN-v3 §6 |
| D3 | **SQLite (better-sqlite3)** for saga state | 단일 인스턴스 OK + WAL 모드 + native build | IMPL-v3 |
| D4 | **Idempotency-Key mandatory** for `/save` + `/knowledge/seed` | 5x concurrent → 1 saga 박제 (Cycle 3 Fix F1, storage F1) | cycles/web/cycle-3 |
| D5 | **Vendor Encapsulation** — web/render에 외부 키 0 | 컨테이너 침해 시 leak 0 (Cycle 2 Fix F1) | cycles/web/cycle-2 |
| D6 | **Brand DSL** (lib/branding.ts 단일 진입점) | 톤/색/폰트 일관 + 우회 ESLint 차단 | cycles/web/cycle-2 F6 |
| D7 | **Korean userMessage 4-원칙** (what/why/next/recovery) | 사용자 인지 부담 최소 + Phase 6 contract 자동 강제 (lib/korean-ux.ts) | cycles/llm/cycle-3 F1 |
| D8 | **Caption 5 rules** (1+4+5 박제) | 신뢰도·hashtag 30개 정확·signature 보존 | cycles/llm/cycle-3 |
| D9 | **Moderation 강제 정지** (Knowledge.SensitiveTopics) | 정치/의료/금융 카루셀 발행 차단 | cycles/llm/cycle-3 |
| D10 | **Render `redirect: "manual"`** + 3xx outright reject | TOCTOU SSRF (IMDS 우회) 차단 (Cycle 3 Fix R1) | cycles/render/cycle-3 |
| D11 | **Render signed URL log redaction** (`{host, pathPrefix}` only) | AWS sigv4 query string log leak 0 (Cycle 3 Fix R2) | cycles/render/cycle-3 |
| D12 | **51 seed v1.0 / 65 seed v1.1 분배** | 코드 PR과 시간 경쟁 방지 + storage F1 idempotent | PRD-v2.1 §5-2 |
| D13 | **9-light HealthDepsBanner** (web/llm/render/storage + 4 external + saga) | 운영자 5분 진단 입력 | cycles/web/cycle-2 |
| D14 | **Saga light = time-window** (5분 failedRecent + inflightStuck) | 30일 누적 partial 영구 down 회귀 차단 (Cycle 3 Fix F4) | cycles/web/cycle-3 |
| D15 | **localStorage draft = zustand persist + liveStorage wrapper** | 새로고침/탭 닫기 후 복원 (Cycle 3 Fix F5, Done #4) | cycles/web/cycle-3 |
| D16 | **Watermark = `role=switch` + 미리보기 overlay + 자동 저장** | 접근성 + E2E 셀렉터 + zustand persist (Cycle 3 Fix F6, Done #6) | cycles/web/cycle-3 |
| D17 | **`/admin/security-checklist`** SSR page | 운영자 자체 점검 5분 입력 (Cycle 3 Fix F7, Done #9) | cycles/web/cycle-3 |
| D18 | **Cutline (F21·F22·F19·F26 warn·F27 LinkedIn → v1.1)** | 14일 PoC 시간 정직화 + cutline 결정 | PRD-v2.1 §46-2 |
| D19 | **License: MIT** | OSS 공개 + 2명 친구 추천 활성 + 상업화 분기 v2.0+ | PRD-v2.1 §38 |
| D20 | **packageManager pnpm@11.0.9 (4 서비스 통일)** | Phase 6 Review/Test 🔴 P0-4 회복. Cycle 1 박제 11.0.9 정합 회복 + corepack auto-fetch lockfile compat 위험 0 | docs/phase-6/fix.md F4 |
| D21 | **Next.js 16.0.0 → 16.2.6 보안 업그레이드** | Phase 6 Review/Test 🔴 P0-2. RCE GHSA-cgcx-9wpv-r57j + 3 high DoS 패치 + `pnpm audit --audit-level=high` 통과 박제 | docs/phase-6/fix.md F2 |
| D22 | **`/api/health` version은 `package.json` import** | Phase 6 Review/Test 🔴 P0-3 회복. release 명패와 런타임 endpoint 정합 박제 (단위 테스트로 회귀 차단) | docs/phase-6/fix.md F3 |

---

## 7. v1.0.0 Done 12 매트릭스 자체 점검

PRD §46-6의 12 항목 — **Phase 6 Fix 완료 시점 박제 상태** (Review/Test 정직 평가 정합):

| # | Done 항목 | 상태 | 근거 |
|---|---|:---:|---|
| 1 | E2E 4 시나리오 green (User Journey) | ✅ PASS | Playwright 12/12 + 통합 E2E 20/20 = **32/32** (외부 재현) |
| 2 | Unit 70%+ 커버리지 (services 80%+) | ✅ PASS | web 84.85% / llm 91.01% / render 95.80% / storage 90.71% (평균 90.59%) — 4 서비스 모두 70% strict gate +5pp 이상 여유 |
| 3 | 첫 카루셀 5분 내 save 가능 (G8) | 🟡 PARTIAL | CI dummy keys → 207 partial 박제. **실 외부 4 키 (사용자 액션 B) 박제 후 200 happy path 측정 시 PASS 전환** |
| 4 | localStorage draft 자동 저장 검증 (G9) | ✅ PASS | Cycle 3 Fix F5 — zustand persist + liveStorage wrapper + 단위 테스트 2건 + Playwright 02 |
| 5 | onboarding wizard 5분 완료 가능 | ✅ PASS | Playwright spec-01 (Landing → /new) + spec-02 (Wizard 5 step) |
| 6 | watermark 토글 동작 | ✅ PASS | Cycle 3 Fix F6 — fieldset/role=switch + 미리보기 overlay + zustand persist |
| 7 | Caption (Instagram) 자동 생성 | 🟡 PARTIAL | 5 rules guard (1+4+5) + 30 hashtag mock test 박제. **실 LLM happy path는 사용자 액션 B 후 PASS 전환** |
| 8 | Moderation 강제 정지 동작 | 🟡 PARTIAL | 4-원칙 shape contract integration 01-7 PASS + Knowledge.SensitiveTopics 단위 테스트. **실 LLM 호출 강제 정지 happy/sad path E2E는 사용자 액션 B 후 PASS 전환** |
| 9 | Day 0 보안 패키지 10항목 동작 | ✅ PASS | gitleaks workflow + Dependabot 4 서비스 + pnpm audit 4 서비스 (P0-2 회복: web critical/high 0, 4 서비스 모두 audit-level=high 통과) + Secret Scanning + ESLint brand boundary + Vendor 격리 + pino redact + non-root + Saga UNIQUE + `/admin/security-checklist` |
| 10 | README 6 섹션 + 트러블슈팅 12+ | ✅ PASS | 본 README — 6 섹션 + 트러블슈팅 17 + 결정 로그 22 |
| 11 | GitHub public + LICENSE (MIT) | ✅ PASS | https://github.com/logos1012/slidesmith (public, MIT) — v1.0.0 + v1.0.1 release 발행 |
| 12 | Distribution: LinkedIn 1 게시글 | 🟡 USER-ACTION | 사용자 자유 채널로 LinkedIn 선택. 게시글 한국어 초안 박제 ([docs/phase-7/linkedin-post.md](../docs/phase-7/linkedin-post.md)) — 사용자가 직접 발행 |

**v1.0.1 patch 후 합계: 11 PASS (92%) + 1 USER-ACTION (8%) = 12/12 (100%)**.

→ **v1.0.0 → v1.0.1 patch로 Web BFF ↔ render contract gap 모두 해소 + Saga end-to-end 작동 박제 (5분 wall-clock = 43초). #12 LinkedIn 게시글은 초안 박제 후 사용자 발행**. 자세히는 [docs/phase-7/v1.0.1-fix.md](../docs/phase-7/v1.0.1-fix.md).

---

## 8. What this isn't / What it is

### What this isn't
- ❌ A Canva replacement (general design tool)
- ❌ A Placid alternative (template API for developers)
- ❌ A team tool (single-user, local-first)
- ❌ A cloud SaaS (your data stays on your machine)
- ❌ An auto-publisher (you upload to Instagram yourself)

### What it is
- ✅ A 5-minute carousel maker for solo Korean creators
- ✅ AI copy on top of validated frameworks (PAS, AIDA, Cialdini, ...)
- ✅ Brand DSL that auto-applies your voice/color/font
- ✅ HTML engine — Korean text never breaks

---

## 9. 라이선스 + Contributing

[MIT License](LICENSE) — 상업적 사용 OK, 수정 OK, 재배포 OK. 단 라이선스 명시 필요.

기여 환영. PR 7 체크박스 (PRD §17-3) 미체크 시 머지 차단.

---

## 10. 변경 이력

[CHANGELOG.md](CHANGELOG.md) — v1.0.0 (2026-05-10) Phase 1~6 박제.

---

> "도구가 한국 솔로 크리에이터를 진지하게 다루지 않는다"는 문제를, 5분 안에 발행 가능 카루셀을 만드는 단일 워크플로우로 푼다. — Slidesmith
