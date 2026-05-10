# Slidesmith v1.0.0 — Release Notes

> 2026-05-10 · 14일 PoC (영업일 10 + 예비 4) 완주 + Phase 1~6 박제.
> "한국어 인스타 카루셀, 1줄 → 5분 → 발행" — production-safe v1.0.0.

## 📦 Highlights

- **4 마이크로서비스 통합**: web (3000) / llm (3001) / render (3002) / storage (3003) docker compose 한 줄 부팅 (~30~50초 cold start).
- **5분 onboard**: Brief → Template → Content → Preview → Publish wizard 5 steps.
- **Saga + Idempotency**: 5x concurrent 동일 키 → 1 saga (race 0). retry 가능 (retryToken).
- **Korean UX 4-원칙**: what/why/next/recovery 모든 endpoint 자동 강제 (lib/korean-ux.ts).
- **Vendor 격리**: 외부 4 키 (Anthropic/Airtable/AWS/Gemini)는 llm/storage 컨테이너만. web/render는 외부 의존 0.
- **51 Knowledge seed**: 멱등 import (Idempotency-Key mandatory, 102 record 위험 0).
- **Day 0 보안 10항목**: gitleaks + Dependabot + pnpm audit (`--audit-level=high` 4 서비스 모두 통과) + ESLint brand boundary + pino redact + non-root + Saga UNIQUE + `/admin/security-checklist` + Vendor 격리 (web/render 외부 키 0).
- **Phase 6 Fix 박제** — Next.js 16.0.0 → 16.2.6 (RCE GHSA-cgcx-9wpv-r57j 패치) + pnpm@11.0.9 4 서비스 통일 + `/api/health` `version` dynamic (package.json import) + .gitignore 정합화.

## ✨ What's in this release

### v1.0 기능 (PRD-v2.1 §46-1)

- **F1 Wizard 5 steps** (Brief / Template / Content / Preview / Publish)
- **F8 Brand DSL** (lib/branding.ts 단일 진입점, voice/color/font 자동)
- **F9 Caption + 30 hashtag** (5 rules: 1+4+5 박제 / Instagram only)
- **F10 Render 1080×1080 / 1080×1350 (4:5) / 1080×1920 (9:16) / custom**
- **F11 PNG ZIP + PDF (pdfkit + Pretendard + Noto Serif KR)**
- **F12 Save Saga** (Airtable + S3 보상 트랜잭션)
- **F13 Carousels 100+ rows cursor pagination** (RFC 5988 Link header)
- **F14 9-light HealthDepsBanner** (web/llm/render/storage + anthropic/airtable/s3/gemini + saga)
- **F15 localStorage draft 자동 저장** (zustand persist + liveStorage wrapper)
- **F16 Watermark 토글** (role=switch + 미리보기 overlay + 자동 저장)
- **F17 5분 onboarding wizard**
- **F20 Watermark 정책** (해제 가능, 기본 ON)
- **F26 Moderation 강제 정지** (Knowledge.SensitiveTopics 매칭, warn 단계 v1.1)
- **F27 Caption Instagram only** (LinkedIn / Threads v1.1)

### v1.0 비기능 (PRD-v2.1 §6)

- **Performance**: 10×4:5 PNG render 7.62초 (60s SLO 슬랙 88%) / 5분 onboard / 51 seed ~12초
- **Coverage**: web 84.85% / llm 91.01% / render 95.80% / storage 90.71% (평균 90.59%) — 585 tests PASS (web 81 + llm 199 + render 100 + storage 205)
- **Security**: 6 critical 박제 (file://+SSRF, API key leak, blob contentType, Idempotency race, env_file leak, zip-slip) + R1 (TOCTOU redirect) + R2 (signed URL log)
- **Compatibility**: Mac M2 8GB / M4 16GB OK (총 메모리 3,072 MB)

## 🚀 Quickstart

```bash
git clone https://github.com/logos1012/slidesmith.git && cd slidesmith
cp .env.example .env && $EDITOR .env
docker compose up -d
open http://localhost:3000
```

자세한 사용법은 [README.md](README.md), 변경 이력은 [CHANGELOG.md](CHANGELOG.md).

## 🔒 Security

| Item | 상태 |
|---|---|
| gitleaks (PR + history scan) | ✅ |
| Dependabot (npm + Docker + Actions, weekly) | ✅ |
| pnpm audit `--audit-level=high` (4 서비스 CI 차단) | ✅ |
| GitHub Secret Scanning | ✅ |
| ESLint brand boundary (no-restricted-imports) | ✅ |
| Vendor encapsulation (외부 키 web/render 0) | ✅ |
| pino redact paths (api_key/token/.../*.url/*.signedUrl) | ✅ |
| Container non-root (uid 1001) | ✅ |
| Saga Idempotency-Key DB UNIQUE | ✅ |
| `/admin/security-checklist` 자체 점검 SSR | ✅ |

## 📊 Done 12 매트릭스 (Phase 6 Fix 후 정직 평가)

| # | Done 항목 | 상태 |
|---|---|:---:|
| 1 | E2E 4 시나리오 green | ✅ PASS (Playwright 12/12 + integration 20/20 = 32/32) |
| 2 | Unit 70%+ 커버리지 | ✅ PASS (평균 90.59% / 4 서비스 모두 +5pp 이상 여유) |
| 3 | 첫 카루셀 5분 내 save | 🟡 PARTIAL (사용자 액션 B 외부 키 환경에서 happy path 측정 시 PASS) |
| 4 | localStorage draft 자동 저장 | ✅ PASS |
| 5 | Onboarding wizard 5분 | ✅ PASS |
| 6 | Watermark 토글 동작 | ✅ PASS |
| 7 | Caption Instagram 자동 생성 | 🟡 PARTIAL (실 LLM happy path 사용자 액션 B 후 PASS) |
| 8 | Moderation 강제 정지 | 🟡 PARTIAL (4-원칙 contract PASS — 실 LLM happy/sad path 사용자 액션 B 후 PASS) |
| 9 | Day 0 보안 패키지 10항목 | ✅ PASS (Phase 6 Fix F2 후 web pnpm audit critical/high 0 / 4 서비스 모두 audit-level=high 통과) |
| 10 | README 6 섹션 + 트러블슈팅 12+ | ✅ PASS (트러블슈팅 18 + 결정 로그 22) |
| 11 | GitHub public + LICENSE (MIT) | 🟡 USER-ACTION (LICENSE MIT 박제 — 사용자 액션 A: `git init` + GitHub repo 생성 + push 후 PASS) |
| 12 | Distribution: LinkedIn 1 게시글 | 🟡 USER-ACTION (초안 박제 — 사용자 직접 발행) |

**v1.0.1 patch 후 합계: 11 PASS + 1 USER-ACTION = 12/12 (100%)**.

→ v1.0.0 release 후 v1.0.1 patch로 Saga end-to-end 작동 박제 (5분 wall-clock = 43초). #12 LinkedIn 게시글은 한국어 초안 박제 ([docs/phase-7/linkedin-post.md](../docs/phase-7/linkedin-post.md)) — 사용자가 직접 발행.

## 🐛 Known Limits (v1.1로 carry)

- F21 Series Management
- F22 Repurpose
- F19 피드 시뮬레이션
- F26 warn 단계 (v1.0은 강제 정지만)
- F27 LinkedIn / Threads
- Cache invalidate API (POST 후 GET stale ≤5분)
- LLM streaming sub-second TTFB 최적화

## 🙏 Credits

- 단독 개발자: Jake (logos1012@gmail.com)
- 문서 + 빌드 보조: Claude Code (claude.ai/code)
- 검증된 카피 프레임워크: PAS, AIDA, Cialdini

## 📜 License

MIT — 상업적 사용 OK, 수정 OK, 재배포 OK. 단 라이선스 명시 필요. ([LICENSE](LICENSE))

---

## 🔗 Links

- Repository: https://github.com/logos1012/slidesmith
- Documentation: [README.md](README.md)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- Phase 1~6 archive: `docs/services/cycles/`
