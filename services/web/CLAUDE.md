# CLAUDE.md — slidesmith-web

> 이 파일은 AI 에이전트(Claude Code)가 `slidesmith/services/web/` 안에서 작업할 때 절대 가이드.
> sw-engineering-principles.md §1-3 (프로젝트 컨벤션 파일) + 50줄 룰 박제.

## 1. 아키텍처 + 파일 설명

`slidesmith-web`은 Slidesmith의 단일 사용자 진입점. 책임:

- **UI 전체** (위저드 5단계, ChatSidebar, Step1~5)
- **BFF** — 다른 3 서비스 (`llm`, `render`, `storage`) HTTP/SSE proxy
- **Saga (PersistOrchestrator)** — 5단계 영속화 + 보상 트랜잭션 (sqlite)
- **Brand DSL Provider** — `lib/container.ts` DI로 server-side 캐시
- **Caption + Moderation** — 70% passthrough 5룰, Knowledge.SensitiveTopics 매칭

자세한 폴더는 `docs/services/SERVICE-web.md` §1.

## 2. 응답 포맷 명세

- TypeScript 5 strict 모드. `any` 금지, `unknown` + narrowing.
- React 19 — Server Component 기본, `'use client'`는 인터랙션 필요할 때만.
- Tailwind v4 — semantic 토큰만 (`bg-bg`, `text-text-muted`). 기본 컬러 family 사용 금지.
- API route: `NextResponse.json(...)` 표준. status code 명시.

## 3. 금지 패턴

- `process.env` 직접 접근 (ESLint `no-process-env`로 자동 차단). `lib/env.ts` 통해서만.
- Hardcode 컬러 (`text-red-500` 등). `var(--color-*)` 또는 semantic alias.
- `.env`를 git에 commit. `.gitignore`에 박제됨.
- 비밀번호/토큰을 로그에 남김. pino redact가 자동 censor.
- `console.log` — 모든 로그는 `lib/logger.ts` (pino) 통해.
- 50줄 초과 단일 파일 — 청크로 분리 (예외 시 PR 본문에 RFC 한 단락).

## 4. 자주 쓰는 명령어

```bash
pnpm dev            # 개발 서버 :3000
pnpm build          # 프로덕션 번들
pnpm test           # vitest 단위
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint --max-warnings=0
docker compose up slidesmith-web   # 컨테이너 단독 실행
```

## 5. 50줄 룰

- 파일당 코드 ≤ 50줄. 명확하면 100줄까지 (PR 본문에 한 줄 정당화).
- 함수당 ≤ 30줄. 분기 깊이 ≤ 3.
- React 컴포넌트당 ≤ 80줄 (props + render JSX 포함). 초과 시 sub-component 추출.
- 위반 시 `make typecheck` 또는 lint warning 등장. PR review에서 분할 권고.

## 6. Day 0 보안 박제

- `.env.example`만 git, `.env`는 `.gitignore`.
- `process.env` 직접 접근 0 (`lib/env.ts` 외).
- 외부 응답 모두 Zod 검증 (Cycle 2 HttpClient impl).
- pino redact: `*.api_key`, `*.token`, `*.password`, `req.headers.authorization`.
- iframe sandbox: Slide preview HTML (Cycle 2 `<SlidePreviewBoundary>`).
- CI: `pnpm audit --audit-level=high` + Dependabot (Cycle 3 release).

## 7. State 관리 룰

| 종류 | 도구 | 영속화 |
|---|---|---|
| Server state | TanStack Query | 5분 staleTime |
| Session state | Zustand | localStorage debounce 1s + sqlite saga.db |
| Theme | React Context | localStorage |
| Brand DSL | React Context | TanStack Query 캐시 |

직렬화 룰: `Map → Record`, `Date → ISO string`, `UUID → string`.

## 8. 검증 워크플로우

새 코드 작성 → `pnpm typecheck` → `pnpm lint` → `pnpm test` → 모두 green이면 commit.
실패 시 에러 출력 읽고 코드 수정, 반복. 한 반복 = 한 변경.
