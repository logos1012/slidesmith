# slidesmith-web

> Slidesmith UI + BFF + Saga (PersistOrchestrator) + Caption + Moderation. 외부 호출 0 — 모든 것은 다른 3 서비스 BFF proxy로.

| 항목 | 값 |
|---|---|
| Port | 3000 (host loopback) |
| Stack | Next.js 16 App Router + React 19 + TypeScript 5 + Tailwind v4 |
| Memory | 768 MB (Docker limit) |
| 외부 호출 | 0 |

## Quickstart

```bash
# 단독 실행 (서비스 1개만)
docker compose up slidesmith-web

# 헬스 확인
curl http://localhost:3000/api/health
# → { "status": "ok", "version": "0.1.0", "timestamp": "...", "uptime": <int> }
```

로컬 개발 (Docker 없이):

```bash
pnpm install
pnpm dev          # localhost:3000
pnpm test         # vitest unit
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
```

## 환경변수

`slidesmith/.env.example` 참조. **web은 외부 4 키 (Anthropic/Airtable/AWS) 직접 읽지 X** (12-Factor #4 + Vendor Encapsulation). `lib/env.ts`에서 Zod 검증 후 `env` named export로만 접근.

## 디렉토리 (Cycle 1 골격)

```
src/
├── app/
│   ├── layout.tsx              # Brand DSL Provider stub + theme bootstrap
│   ├── page.tsx                # Landing (5초 hero copy + CTA)
│   └── api/
│       ├── health/route.ts     # liveness
│       └── health/deps/route.ts  # 9-light banner (Cycle 1: mock)
├── lib/
│   ├── env.ts                  # process.env 단일 진입점 + Zod
│   ├── logger.ts               # pino + redact
│   └── branding.ts             # NEXT_PUBLIC_TAGLINE/REPO 단일 source
└── styles/
    └── globals.css             # Tailwind + monochrome tokens (DESIGN-v3 §1-1, §1-2)
```

## 결정 로그

- **Next.js 16 App Router**: SSR + API route + RSC 한 번에. Saga 같은 stateful BFF 로직도 server action / route handler로 분산.
- **monochrome editorial**: 도구 UI = `--color-*`만. 사용자 카루셀 = `.slide-preview-container` 자손에서만 `--brand-color-*` 허용 (DESIGN-v3 §1-3).
- **process.env 단일 진입점**: `lib/env.ts` 외 어디서도 직접 접근 금지. ESLint `no-process-env` 강제.
- **Saga step replay (Cycle 3 A2)**: better-sqlite3 prod native build + recoverIncomplete 부팅 hook. saga.db 컨테이너 재시작 후 박제 + currentStep 기반 정확 재진입.
- **Saga in-flight dedup (Cycle 3 Fix F1)**: in-process Map 위에 DB UNIQUE INSERT OR IGNORE + post-upsert reread. 다중 instance race close — 같은 idempotencyKey는 항상 단 1 saga만 살아남음, race-loser는 winner saga로 redirect.
- **Saga light time-window (Cycle 3 Fix F4)**: fixed-threshold(<5)에서 시간 윈도우(최근 5분)로 교체. 30일 누적 partial saga가 영구 down으로 표시되던 회귀 차단.
- **Caption 5 rules guard (Cycle 3 A3)**: passthrough 70% / 첫 줄 25자 / 5 lines / 해시태그 3~7 — 한국어 silent fix.
- **Moderation pre-flight (Cycle 3 A4)**: 발행 전 /api/moderation 호출 → flagged 시 confirm dialog (Korean UX 4-원칙).
- **localStorage draft autosave (Cycle 3 Fix F5)**: zustand persist middleware로 wizard step 1~4 입력 자동 저장. reset() 시 비움.

## Day 0 보안 10항목

운영자 자체 점검: `/admin/security-checklist` 페이지 (Cycle 3 Fix F7 박제). 9/10 PASS + 1건 (release/distribution) Phase 6 통합.

## 트러블슈팅

- **`pnpm install` 시 `better-sqlite3` 빌드 실패**: `apk add --no-cache python3 make g++` (Dockerfile alpine 베이스에서 자동 처리됨, 로컬은 macOS 기본 toolchain).
- **Tailwind v4 PostCSS 에러**: `@tailwindcss/postcss` 가 `postcss.config.mjs`에 있는지 확인.
- **wizard 새로고침 시 step 1로 돌아감**: 정상 동작. step 진행도는 영속 X (혼란 방지). brief/template/slides 등 입력은 자동 복원됨.
- **/api/health/deps saga light가 down**: 최근 5분 안에 saga 3건+ 실패 또는 stuck 의심 (5분 이전 시작된 running). saga.db 직접 조회로 원인 파악.
