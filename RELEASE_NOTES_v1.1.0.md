# Slidesmith v1.1.0 — Aurora Redesign

**Release date**: 2026-05-10
**Tag**: `v1.1.0`
**Previous**: `v1.0.0` (2026-05-10, Phase 6 release)

---

## Summary

Slidesmith **도구 UI 전체 Aurora 재설계** — monochrome editorial 정책 폐기, Aurora vibrant gradient + glassy cards + creator-friendly로 swap.

- **사용자 carousel 결과물 변화 0** — Layer 1 격리 (`--brand-color-*` namespace ⟂ `--aurora-*`) 그대로.
- **4 마이크로서비스 영향 0** — web src + render `slide-html.ts` defaults 2 hex만 swap.
- **5분 onboard wall-clock 회귀 0** — v1.0.0 baseline 43s, v1.1.0 measured 44s (60s ceiling 안).

---

## Highlights

### 1. Aurora design system (Loop 1)

- **25 토큰 박제** (carousel design `styles.css` byte-for-byte 정합):
  - violet `#7c5cff` / mint `#46e0c6` / amber `#ffb547` / danger `#f04a6b`
  - ink-deep `#170d2e` / ink-2 `#4a3d6b` / ink-3 (semantic alias)
  - grad-hero (cream linear-gradient) / grad-button (violet→pink) / grad-card
  - shadow-card / shadow-button / radius-* (4/8/12/14/18/24)
- **Sidebar 64px** (Plus/Layers/Sparkles/Cloud/Shield) + 좌측 violet bar
- **TopBar 48px** + Logo + breadcrumb
- **Landing (`/`) Aurora chrome** — Hero / DemoCard / Insights (aurora-1.jsx 13 패턴)

### 2. Wizard + Components (Loop 2)

- **Aurora primitives** — `AuroraCard` / `AuroraChip` (default·violet·mint·amber·danger) / `AuroraButton` (primary·ghost·soft) / `AuroraBar` / `AuroraStepRail` / `AuroraOptionGroup`.
- **Wizard 5 step rewrite**:
  - **Step 1 — 주제 입력**: AuroraBrief big-input (focus violet ring) + AuroraOptionGroup (ratio/platform).
  - **Step 2 — 템플릿 선택**: 5색 violet→pink spectrum gradient thumbnail + active violet border + grad shadow.
  - **Step 3 — 본문 생성**: 좌측 hsl-spectrum 56×56 인덱스 박스 + AuroraChip "SLIDE 0X" + 카운트 mono.
  - **Step 4 — 미리보기**: aurora-card chrome + AuroraChip mint(on)/default(off) watermark + render grid Aurora frame + SlidePreviewBoundary Layer 1 격리.
  - **Step 5 — 발행**: SagaPipelinePreview (5-step 원형) + Saga 결과 톤 분리 (success=mint / partial=amber / orphan=danger) + ModerationCard sub-component.
- **Components Aurora swap**:
  - `health-deps-banner.tsx` — 9-light Aurora 4 톤 dot strip (success/amber/danger/dashed-line)
  - `chat-sidebar.tsx` — violet user bubble (grad-button white) + glassy assistant bubble (aurora-surface-2 ink)
  - `slide-preview-boundary.tsx` — `data-slide-preview="true"` attribute 박제 (Layer 1 boundary)
  - `admin/security-checklist/page.tsx` — Sidebar + TopBar + BigStat + 10 항목 aurora-card

### 3. Slide template Aurora 적용 (Loop 2)

- **web BFF `lib/content-to-html.ts`**:
  - light: `linear-gradient(135deg,#f1e6d0 0%,#e8c9b0 55%,#c9d4be 100%)` cream + `#170d2e` ink-deep + `#7c5cff` violet 4×64 strip
  - dark: `linear-gradient(160deg,#7c5cff,#c25dff,#ff6b9d)` + white text
  - 좌상단 `01 / 05` mono index marker + Pretendard Variable
- **render service `services/render/src/lib/slide-html.ts`**:
  - DEFAULT_PRIMARY: `#111111` → `#170d2e` (Aurora ink-deep)
  - DEFAULT_ACCENT: `#3366ff` → `#7c5cff` (Aurora violet)
  - 사용자 brand DSL은 그대로 (Layer 1 격리 — `--brand-color-primary` inline override)

### 4. Tests + E2E + Docs (Loop 3 — 본 release)

- **E2E `06-monochrome-boundary.spec.ts` → `06-aurora-boundary.spec.ts` rename** + Aurora 토큰 적용 박제 assertion 추가 (3/3 PASS).
- **AuroraStepRail aria-label fix** — Loop 2 wizard rewrite로 인한 E2E 01-onboard 회귀 해소.
- **DESIGN-v3.md 본문 카피 swap** — Loop 2 review §8-2의 11+ 위치 모두 swap (§1·§5·§6·§13·§17·§18·§19·§20). monochrome editorial framing → Aurora vibrant gradient + glassy + creator-friendly. 격리 메커니즘 카피는 동일.
- **Health endpoint version 1.1.0** — `services/web/tests/unit/health.test.ts` 박제.
- **4 서비스 package.json version 1.0.0 → 1.1.0** — web, llm, render, storage 모두.

---

## Verification

| 영역 | v1.0.0 | v1.1.0 | Δ |
|---|---|---|---|
| 4 마이크로서비스 healthy | ✅ | ✅ | 0 |
| `/api/health` version | 1.0.0 | **1.1.0** | swap |
| web typecheck + lint --max-warnings=0 | PASS | **PASS** | 0 |
| render/storage/llm typecheck + lint | PASS | **PASS** | 0 |
| web unit tests | 80 | **90** | +10 |
| render unit tests | 100 | 100 | 0 |
| storage unit tests | 205 | 205 | 0 |
| llm unit tests | 199 | 199 | 0 |
| **총 unit tests** | **584** | **594** | **+10** |
| Playwright E2E (06 Aurora boundary) | 2 | **3** | +1 |
| Integration E2E | 19/20 (1 pre-existing) | **19/20** (동일 pre-existing) | 0 |
| 5분 onboard wall-clock | 43s | **44s** | 회귀 0 (60s 안) |

### 회귀 0 박제

- Saga 5-step (success / partial / orphan) — 모두 Aurora 톤으로 작동
- 11 forward-compat (typecheck + contract test)
- 보안 6 critical (pino redact / env 단일 / ZIP traversal / CSP / sanitize / no-process-env)
- Vendor 격리 14-pattern (no-restricted-imports)
- 3-Layer DI (container.test PASS)
- Brand DSL Layer 1 격리 (curl HTML `--brand-color-*` 0건)
- ESLint Aurora boundary (Property + Literal + slide-preview-boundary 예외)
- themeBootstrap inline script (dark variant hydration 0 깜빡임)

---

## Breaking Changes

**없음**. Aurora swap은 도구 UI 표면만 — API contract / 서비스 통신 / 사용자 carousel 결과물 모두 변화 0.

---

## Migration Guide

`v1.0.0` → `v1.1.0` 업그레이드는 **재시작 외 별도 작업 0**.

```bash
git pull origin main
git checkout v1.1.0
docker compose down
docker compose up -d --build   # web 컨테이너만 재빌드 필요 (Aurora swap reflect)
# Wait for 4/4 healthy (~15s)
curl http://localhost:3500/api/health  # version 1.1.0 박제
```

사용자 brand DSL (`--brand-color-*`) 영향 0 — 기존 carousel 결과물 변화 없음.

---

## Known Limits (v1.2 carry)

- **Pretendard self-host + `font-display: optional`** — 폰트 자산 추가 scope 폭발 위험.
- **LLM slideCount 강제 prompt** — render zod cap (≤5) 추가는 v1.1.1 patch 가능.
- **Visual regression baseline 자동 캡처** (Playwright snapshot) — v1.1.1 patch 후보.
- **aurora-2.jsx Brand DSL right panel + 9-light card grid + 30 hashtag explicit grid** (Loop 2 review m6).
- **Integration 01-6 web /api/knowledge BFF schema mismatch** (`examples` 필드 zod) — pre-existing v1.0.0 이슈.
- **E2E 03/04/05 strict 207 assertion** — Saga가 CI dummy keys에서도 200 success 반환 (storage/airtable mock-success), pre-existing v1.0.0 테스트 logic 이슈.

---

## References

- **Aurora source**: `slidesmith/carousel design/aurora-{1,2,3}.jsx` + `styles.css`
- **DESIGN doc**: `docs/DESIGN-v3.md` §40 Decision log #51 D-aurora-1 + §41 Approval row
- **Loop 1 Build**: `docs/aurora/loop-1/build.md`
- **Loop 2 Build/Review/Fix**: `docs/aurora/loop-2/{build,review,fix}.md`
- **Loop 3 Build**: `docs/aurora/loop-3/build.md`

---

🎨 Aurora redesign 박제 by Jake (logos1012)
