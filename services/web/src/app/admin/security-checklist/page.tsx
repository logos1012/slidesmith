// /admin/security-checklist — Day 0 보안 10항목 자체 점검 page (Aurora swap Loop 2 Build 2026-05-10).
//   PRD-v2.1 §46-6 #9 (Day 0 보안 패키지 10항목 동작) 박제 입력.
//   외장: carousel design/aurora-3.jsx AuroraHealth 9-light card 패턴 흡수.
import { Shield, Check, Clock } from 'lucide-react';
import { env } from '@/lib/env';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ChecklistItem {
  num: number;
  title: string;
  detail: string;
  status: 'PASS' | 'PHASE-6';
  evidence: string;
}

function buildChecklist(): ChecklistItem[] {
  return [
    {
      num: 1,
      title: '12-Factor #3 — env 분리 + fail-fast',
      detail: 'process.env는 lib/env.ts (zod schema) 단일 진입점만 접근. invalid 시 즉시 throw.',
      status: 'PASS',
      evidence: `NODE_ENV=${env.NODE_ENV} / LOG_LEVEL=${env.LOG_LEVEL} / SAGA_DB_PATH=${env.SAGA_DB_PATH}`,
    },
    {
      num: 2,
      title: '12-Factor #6 — Container non-root user',
      detail: 'Dockerfile dev/prod 모두 USER nextjs(uid=1001). docker exec id로 검증 가능.',
      status: 'PASS',
      evidence: 'docker exec slidesmith-web id → uid=1001(nextjs) gid=1001(nodejs)',
    },
    {
      num: 3,
      title: '12-Factor #11 — stdout 구조화 로그 + secret redact',
      detail: 'pino logger.ts. *.api_key/*.token/*.password/authorization/cookie 모두 [REDACTED].',
      status: 'PASS',
      evidence: 'lib/logger.ts redact paths 7개 / 모든 신규 endpoint logger 박제 (Cycle 3 Fix F3)',
    },
    {
      num: 4,
      title: 'Vendor 캡슐화 — 외부 4 키 web 컨테이너 비노출',
      detail: 'docker-compose.yml environment 화이트리스트 — Anthropic/Airtable/AWS/Gemini 키 web에 0.',
      status: 'PASS',
      evidence: 'docker exec slidesmith-web env | grep -iE "(ANTHROPIC|AIRTABLE|AWS|GEMINI)" → 0 hits',
    },
    {
      num: 5,
      title: 'Zod 입력 검증 (모든 BFF route)',
      detail: '/api/save · /api/render · /api/content/generate · /api/moderation 모두 parseOr400 + Korean userMessage.',
      status: 'PASS',
      evidence: 'lib/schemas/persist-input.schema.ts 외 4개 + 단위 테스트 박제',
    },
    {
      num: 6,
      title: 'Saga idempotency — DB UNIQUE + race-loser redirect',
      detail: 'idempotencyKey UNIQUE 제약 + INSERT OR IGNORE + post-upsert reread → 다중 instance 이중 실행 0.',
      status: 'PASS',
      evidence: 'persist-orchestrator.ts F1 박제 + 단위 테스트 (multi-instance race) + 단일 instance E2E 통과',
    },
    {
      num: 7,
      title: 'Saga step replay — 컨테이너 재시작 후 보존',
      detail: 'better-sqlite3 prod native build + saga.db 영속 + recoverIncomplete 부팅 hook.',
      status: 'PASS',
      evidence: 'instrumentation.ts + Dockerfile alpine python3/g++/linux-headers + saga.db 24KB',
    },
    {
      num: 8,
      title: 'ESLint brand boundary + no-restricted-imports',
      detail: '--brand-color-* CSS 변수는 SlidePreviewBoundary 안에서만 허용. process.env는 lib/env.ts만.',
      status: 'PASS',
      evidence: 'eslint.config.mjs no-restricted-imports + Cycle 2 negative test 박제',
    },
    {
      num: 9,
      title: 'pnpm audit script + CI workflow',
      detail: 'package.json `audit` script + GitHub Actions에서 high+ 차단.',
      status: 'PASS',
      evidence: 'package.json L18 audit script + .github/workflows/ci.yml 박제 (root)',
    },
    {
      num: 10,
      title: 'Day 0 release — Gitleaks / Dependabot / LICENSE / Twitter',
      detail: 'GitHub repo public + LICENSE MIT + Gitleaks scan + Dependabot weekly + Twitter 1 트윗.',
      status: 'PHASE-6',
      evidence: 'Phase 6 v1.0.0 release 단계에서 통합 박제 (root README / GitHub Actions / Twitter)',
    },
  ];
}

export default function SecurityChecklistPage() {
  const items = buildChecklist();
  const passCount = items.filter((i) => i.status === 'PASS').length;
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar activeIndex={4} />
      <div className="flex flex-1 flex-col">
        <TopBar crumbs={['관리자', '보안 점검']} />
        <main className="flex-1 overflow-auto bg-aurora-bg p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span aria-hidden className="grid h-9 w-9 place-items-center rounded-[10px] text-white" style={{ background: 'var(--grad-button)' }}>
                    <Shield size={18} strokeWidth={1.6} />
                  </span>
                  <h1 className="text-2xl font-bold text-ink tracking-[-0.01em]">Day 0 보안 패키지 10항목 점검</h1>
                </div>
                <p className="text-sm text-ink-2">
                  PRD-v2.1 §46-6 #9 박제 입력. {passCount}/{items.length} PASS — 잔여{' '}
                  {items.length - passCount}건은 Phase 6 release 단계에서 통합 검증.
                </p>
              </div>
              <div className="aurora-card flex items-center gap-4 px-4 py-3">
                <BigStat n={String(passCount)} l="PASS" tone="ok" />
                <BigStat n={String(items.length - passCount)} l="PHASE-6" tone="warn" />
              </div>
            </header>
            <ol className="space-y-2.5">
              {items.map((item) => (
                <li key={item.num} className="aurora-card p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-ink-3">#{String(item.num).padStart(2, '0')}</span>
                    <h2 className="text-base font-bold text-ink">{item.title}</h2>
                    <span
                      className="aurora-tag ml-auto inline-flex items-center gap-1"
                      style={
                        item.status === 'PASS'
                          ? { background: 'rgba(43,182,115,.15)', color: '#1d8a55', borderColor: 'transparent' }
                          : { background: 'rgba(255,181,71,.18)', color: '#a86600', borderColor: 'transparent' }
                      }>
                      {item.status === 'PASS' ? <Check size={11} strokeWidth={2} /> : <Clock size={11} strokeWidth={1.8} />}
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-2">{item.detail}</p>
                  <p className="mt-2 font-mono text-xs text-ink-3 break-all">{item.evidence}</p>
                </li>
              ))}
            </ol>
            <p className="text-xs text-ink-3">
              본 페이지는 운영자 자체 점검용. 실제 검증은 docker compose 통합 + pnpm audit + e2e 스펙.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function BigStat({ n, l, tone }: { n: string; l: string; tone: 'ok' | 'warn' }) {
  const c = tone === 'ok' ? '#2bb673' : '#d9941f';
  return (
    <div className="text-right">
      <div className="font-mono text-2xl font-bold leading-none" style={{ color: c }}>{n}</div>
      <div className="mt-1 text-[10px] text-ink-3">{l}</div>
    </div>
  );
}
