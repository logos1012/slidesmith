# Changelog

All notable changes to Slidesmith are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-05-10 (Phase 6 Build)

> v1.0.0 production 진입 직전 박제. 4 마이크로서비스 docker compose 통합 + Done 12 매트릭스 9/12 PASS + 보안 박제 6 critical 영구.

### Added — Phase 1 (IMPL-v3 동기화 + PRD-v2.1 patch)

- 14일 영업일 PoC 캘린더 정직화 (영업일 10 + 예비 4)
- 51 v1.0 seed + 65 v1.1 seed 분배 (코드 PR과 시간 경쟁 방지)
- 4 신규 테이블 schema Day 1 추가 (forward-compat, v1.1 마이그레이션 부담 0)
- F21 Series, F22 Repurpose, F19 피드 시뮬, F26 warn, F27 LinkedIn → v1.1 cutline

### Added — Phase 2 (ARCH-v3 마이크로서비스 + Docker 6-loop)

- 4 서비스 정의: web (3000) / llm (3001) / render (3002) / storage (3003)
- 통신 그래프 DAG (순환 의존성 0): web → {llm, render, storage} → 외부
- Vendor 격리: 외부 키는 llm/storage 컨테이너에만, web/render는 외부 의존 0

### Added — Phase 3 (DESIGN-v3 화이트앤블랙 톤 6-loop)

- 화이트앤블랙 모노크롬 톤 (Brand DSL 단일 진입점 lib/branding.ts)
- 9-light HealthDepsBanner (web/llm/render/storage + anthropic/airtable/s3/gemini + saga)
- ChatSidebar SSE 4 가지 목적 (수정/제안/맥락/디버깅)
- Wizard 5 steps (brief / template / content / preview / publish)

### Added — Phase 4 (4 SERVICE-SPEC + Docker Compose 정의)

- `docs/services/SERVICE-{web,llm,render,storage}.md` 4 SPEC 박제
- `docker-compose.yml` 정식 (4 서비스 + healthcheck + memory limits)
- `.env.example` 모든 키 분배 + 비용·시간 표

### Added — Phase 5 (4 서비스 × 3 사이클 × 4 stage = 48 sub-agents)

- **web**: 80 tests / coverage 84.85% / Playwright E2E 12/12 (4.3s) / Done 12 web 영역 9/12
- **llm**: 199 tests / coverage 91.01% / Phase 6 contract 8/8 영구 박제 (`lib/korean-ux.ts:respondWithKoreanError`)
- **render**: 100 tests / coverage 95.80% / SLO 7.62s (10×4:5 PNG, 60s SLO 슬랙 88%) / 보안 13 controls + R1+R2 박제
- **storage**: 205 tests / coverage 90.71% / vendor 0 leak (14 패턴 × 8 surface) / 51 seed idempotent

총 **584 tests / 평균 90.59% coverage** / 6 보안 박제 critical (file://+SSRF, API key leak, blob contentType, Idempotency race, env_file leak, zip-slip).

### Added — Phase 6 (Docker Compose 통합 + E2E + Done 12 + v1.0.0 release)

- **A. docker-compose.yml** depends_on healthy 활성 (web ← {storage, llm, render})
- **B. README.md (한국어)** — 6 필수 섹션 + 트러블슈팅 18 항목 + 결정 로그 22 항목
- **B. LICENSE (MIT)** — 상업적 사용 OK + 라이선스 명시 필요
- **B. CHANGELOG.md (본 파일)** — Phase 1~6 핵심 결정 박제
- **C. `.github/workflows/ci.yml`** — 4 서비스 통합 matrix + Dependabot + license-check
- **C. `.github/dependabot.yml`** — npm + Docker + Actions 주간 PR 자동
- **D. tests/integration/** 통합 E2E 3 spec — 00-cold-start / 01-end-to-end-onboard / 02-saga-recover-cross-service
- **E. version 1.0.0 박제** — 4 서비스 package.json 모두
- **E. RELEASE_NOTES_v1.0.0.md** — GitHub release draft

### Fixed — Phase 6 Fix (Review/Test 🔴 4 P0 차단 해소, v1.0.0 release 진입 가능)

- **F1 (P0-1)**: `.gitignore` 정합화 (env, node_modules, dist/build, .next, data, coverage, test-results 등 박제) + git 초기화 사용자 액션 가이드 (`docs/phase-6/fix.md`).
- **F2 (P0-2)**: services/web `next: 16.0.0` → `16.2.6` (RCE GHSA-cgcx-9wpv-r57j + 3 high DoS 패치). `eslint-config-next` 동일 16.2.6. `pnpm audit --audit-level=high` 4 서비스 모두 통과 (exit=0).
- **F3 (P0-3)**: services/web `/api/health` `VERSION` 하드코드 → `package.json` import. release 명패와 런타임 endpoint 정합 박제 + 회귀 차단 단위 테스트 추가 (`expect(version).toBe('1.0.0')`).
- **F4 (P0-4)**: services/web `packageManager: pnpm@9.12.0` → `pnpm@11.0.9` (다른 3 서비스 정합). 6 CI workflow + Dockerfile + lockfile 모두 11.0.9 통일. `pnpm.onlyBuiltDependencies` 화이트리스트 박제 (better-sqlite3, esbuild, sharp, unrs-resolver).

### Security — Day 0 보안 패키지 (Done #9)

- gitleaks (PR + history scan, GitHub Action)
- Dependabot (npm + Docker + Actions, weekly PR)
- pnpm audit `--audit-level=high` (4 서비스 모두 CI 차단)
- GitHub Secret Scanning (무료, repo settings)
- ESLint brand boundary (lib/branding.ts 단일 진입점, no-restricted-imports)
- Vendor encapsulation (외부 키는 llm/storage 컨테이너만)
- pino redact paths (api_key/token/password/authorization/cookie/*.url/*.signedUrl)
- Container non-root user (uid 1001 dev + prod)
- Saga Idempotency-Key DB UNIQUE (다중 instance race 0)
- `/admin/security-checklist` 자체 점검 SSR page (운영자 5분 진단)

### Decisions — v1.0.0 핵심 결정 (22개, README §6 결정 로그 참조)

`README.md` §6 Decision Log 참조 (D1~D22). Phase 6 Fix가 D20 (pnpm@11.0.9 통일), D21 (Next.js 16.2.6 보안), D22 (`/api/health` version dynamic) 추가.

### Known Limits (v1.1로 carry)

- F21 Series Management (v1.1)
- F22 Repurpose (v1.1)
- F19 피드 시뮬레이션 (v1.1)
- F26 warn 단계 (v1.0은 강제 정지만)
- F27 LinkedIn / Threads (v1.0은 Instagram only)
- Cache invalidate API (POST 후 GET stale ≤5분, storage M2 v1.1 backlog)
- LLM streaming sub-second TTFB (Anthropic SDK 측정 최적화)
- A/B test framework (v2)

### Performance (Phase 6 박제)

| 지표 | 값 | 근거 |
|---|---|---|
| 4 서비스 cold start | ~30~50초 (M2 8GB) | docker compose up + healthcheck |
| 5분 onboard E2E | < 5분 | wizard 5 steps + Playwright spec-01/02 |
| 10×4:5 PNG render | 7.62초 (SLO 60초, 88% 슬랙) | render Cycle 3 Fix |
| 51 seed import | ~12초 (dummy keys) | storage F1 Idempotent |
| Saga 5x concurrent same-key | 1 saga (4 alreadyExists) | web Cycle 3 F1 + storage F1 |

---

## [1.1.0] — 2026-05-10 (Aurora Redesign — Loop 1+2+3 Build)

> Slidesmith **도구 UI 전체 Aurora 재설계** 완료. Layer 1 격리 메커니즘 (`--brand-color-*` namespace ⟂ `--aurora-*`)은 동일 — 사용자 carousel 결과물 변화 0. 4 마이크로서비스 영향 0 (web src + render `slide-html.ts` defaults 2 hex만 swap).

### Added — Loop 1 (design system + Landing/Layout, 2026-05-10)

- **Aurora 25 토큰 박제** — `services/web/src/styles/globals.css`의 `.dir-aurora`에 carousel design `styles.css` byte-for-byte 정합 (vibrant gradient + glassy: violet `#7c5cff`, mint `#46e0c6`, amber `#ffb547`, danger `#f04a6b`, ink-deep `#170d2e`, grad-hero/grad-button/grad-card, shadow-card/button, radius-*).
- **Sidebar 64px + 5 nav** (Plus/Layers/Sparkles/Cloud/Shield) + 좌측 violet bar.
- **TopBar 48px** + Logo + breadcrumb + right slot.
- **Landing (`/`) Hero/DemoCard/Insights** — aurora-1.jsx 13 패턴 박제.
- **Layout `font-sans` body** + themeBootstrap inline script (dark variant SSR flash 방지).
- **6-Layer Defense** — Layer 1 `--brand-color-*` slide-preview 자손 한정 / Layer 2 Tailwind family 미노출 / Layer 3 ESLint Property+Literal / Layer 4 WatermarkRenderer parent.closest dev assert / Layer 5 visual regression baseline (Loop 3) / Layer 6 themeBootstrap dark variant.
- **D-aurora-1 결정** (§40 #51) — monochrome editorial 정책 폐기, Aurora vibrant gradient + glassy + creator-friendly로 swap.

### Added — Loop 2 (Wizard/Components/Slide template, 2026-05-10)

- **Aurora primitives** (`AuroraCard` / `AuroraChip` / `AuroraButton` / `AuroraBar` / `AuroraStepRail` / `AuroraOptionGroup`).
- **Wizard 5 step rewrite** — Step 1 (AuroraBrief big-input + AuroraOptionGroup) / Step 2 (5색 violet→pink spectrum gradient thumbnail) / Step 3 (hsl-spectrum 인덱스 박스 + AuroraChip + SlideEditCard) / Step 4 (aurora-card chrome + WatermarkFieldset + RenderPreviewGrid + SlidePreviewBoundary Layer 1 격리) / Step 5 (SagaPipelinePreview + ModerationCard + PublishResultCard 3 분기 mint/amber/danger 톤).
- **Components Aurora swap** — `health-deps-banner.tsx` (Aurora 4 톤 dot strip), `chat-sidebar.tsx` (violet user bubble + glassy assistant bubble), `slide-preview-boundary.tsx` (`data-slide-preview="true"` attribute 박제), `admin/security-checklist/page.tsx` (Sidebar + TopBar + BigStat + 10 항목 aurora-card).
- **Slide template Aurora 적용** — web BFF `lib/content-to-html.ts` (light=cream gradient + violet accent / dark=violet→pink + white) + render service `slide-html.ts` (DEFAULT_PRIMARY `#170d2e` + DEFAULT_ACCENT `#7c5cff`). Brand DSL boundary는 그대로 (Layer 1 격리).
- **50줄 룰 sub-component 분리** (Loop 2 Fix) — Step 3/4/5 main 함수 ~130/~130/~165 → ~105/~87/~119 LOC.

### Added — Loop 3 (Tests + E2E + Docs swap, 2026-05-10 — 본 release)

- **E2E rename** — `06-monochrome-boundary.spec.ts` → `06-aurora-boundary.spec.ts` (3/3 tests PASS, Aurora 토큰 적용 박제 assertion 추가).
- **AuroraStepRail aria-label fix** — `<ol aria-label="wizard progress">` 위치 수정 (Loop 2 wizard-container rewrite 회귀 해소, E2E 01-onboard PASS 복원).
- **DESIGN-v3.md 본문 카피 swap** — §1 헤더 / §1-1-1 Status 주석 / §1-4 Tailwind config / §5-1 4 services 매트릭스 / §6-1 BC Visual Identity 표 8 셀 / §12-3 watermark fallback / §13 Anti-positioning 헤더 + 매트릭스 / §17 Welcome 1줄 / §18 Editorial 미학 정당성 + About 풀 본문 / §19 Aesthetic Boredom + framing 메커니즘 / §20 Motion spec 헤더. monochrome editorial framing 모두 Aurora 의미로 swap. 격리 메커니즘 카피는 동일.
- **Health endpoint version 1.1.0** — `services/web/tests/unit/health.test.ts` `expect(version).toBe('1.1.0')` 박제.
- **4 서비스 package.json version 1.0.0 → 1.1.0** — web, llm, render, storage 모두.

### Performance (Loop 3 박제)

| 지표 | v1.0.0 | v1.1.0 (Loop 3) |
|---|---|---|
| 5분 onboard wall-clock (5-slide LLM + Saga) | 43s | **44s** (회귀 0, ceiling 60s) |
| web unit tests | 80 PASS | **90 PASS** (10 추가 — wizard primitives + Aurora swap 검증) |
| render unit tests | 100 PASS | 100 PASS |
| storage unit tests | 205 PASS | 205 PASS |
| llm unit tests | 199 PASS | 199 PASS |
| **총 unit tests** | **584 PASS** | **594 PASS** (+10) |
| Playwright E2E (06 Aurora boundary) | 2 PASS | **3 PASS** (+1 Aurora 토큰 적용 박제) |
| Integration E2E | 19 PASS / 1 pre-existing fail (01-6 knowledge BFF schema) | 19 PASS / 1 pre-existing fail (회귀 0) |

### 회귀 0 박제 (4 마이크로서비스 + Saga + 보안)

- 4 마이크로서비스 healthy (docker compose 4/4)
- `/api/health` version 1.1.0 + uptime 정상
- Saga 5-step success / partial / orphan 3 분기 모두 작동
- 11 forward-compat (typecheck + contract test)
- 보안 6 critical (pino redact / env 단일 / ZIP traversal / CSP / sanitize / no-process-env)
- Vendor 격리 14-pattern (no-restricted-imports)
- 3-Layer DI (container.test PASS)
- Brand DSL Layer 1 격리 (`--brand-color-*` curl HTML 0건; admin literal text 1건 = 자기 정책 선언)
- ESLint Aurora boundary (Property + Literal + slide-preview-boundary 예외)
- themeBootstrap inline script (dark variant hydration 0 깜빡임)

### Decisions — v1.1.0 핵심 결정

`docs/DESIGN-v3.md` §40 Decision Log #51 D-aurora-1 + §41 Approval row 정합. monochrome editorial 정책 → Aurora vibrant gradient + glassy + creator-friendly swap.

### Known Limits (v1.2 carry)

- **Pretendard self-host + `font-display: optional`** (Loop 1 review m4) — 폰트 자산 추가 = scope 폭발 위험.
- **LLM slideCount 강제 prompt** (Loop 2 build §6-4 ⚠️) — render zod cap (≤5).
- **Visual regression baseline 자동 캡처** — Loop 3는 manual baseline 권고만 박제 (Playwright snapshot 추가는 v1.1.1 patch 후보).
- **aurora-2.jsx Brand DSL right panel + 9-light card grid + 30 hashtag explicit grid** (Loop 2 review m6).
- **Integration 01-6 web /api/knowledge BFF schema mismatch** (`examples` 필드 zod 미스매치) — pre-existing v1.0.0 이슈, Aurora 무관.
- **E2E 03/04/05 strict 207 assertion** — Saga가 CI dummy keys에서도 200 success 반환 (storage/airtable mock-success), pre-existing v1.0.0 테스트 logic 이슈, Aurora 무관.

---

## [Unreleased]

(아직 없음)

---

[1.1.0]: https://github.com/logos1012/slidesmith/releases/tag/v1.1.0
[1.0.0]: https://github.com/logos1012/slidesmith/releases/tag/v1.0.0
