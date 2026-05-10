// Step 5 — 캡션 + S3 업로드 + Airtable 저장 (Saga) — Aurora swap, Loop 2 Build 2026-05-10.
// Cycle 2 Fix (F5, 🟠-6): individual selector + useShallow → 무관 필드 변경 시 re-render 0.
// Cycle 3 (A4): Moderation guard 박제. 발행 전 /api/moderation 호출 → flagged 시 confirm.
// 외장: carousel design/aurora-3.jsx AuroraSaga (5-step + idempotency badge) + AuroraModeration (4-원칙) 흡수.
// Loop 2 Fix (F1, m4): PublishResultCard sub-component 분리 — success/partial/orphan 3 분기 묶음, 본 함수 ~75 LOC.
'use client';
import { useState } from 'react';
import { Cloud, ArrowRight, AlertTriangle, Check, Shield } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useWizardStore } from '@/stores/wizard-store';
import type { PersistResult } from '@/repositories/interfaces/IPersistOrchestrator';
import { AuroraButton, AuroraChip } from '@/components/aurora/primitives';

interface ModerationResp {
  ok: boolean;
  userMessage: string | null;
  flaggedTerms: string[];
}

const SAGA_STEPS = [
  { k: '01', t: 'LLM 카피 검증 + Brand DSL 적용' },
  { k: '02', t: 'Render PNG 5장 (Puppeteer)' },
  { k: '03', t: 'S3 업로드 (presigned PUT)' },
  { k: '04', t: 'Airtable 레코드 생성' },
  { k: '05', t: 'Caption + 30 hashtag 저장' },
];

export function Step5Publish() {
  const { sessionId, templateId, ratio, platform, slides, watermark } = useWizardStore(
    useShallow((s) => ({
      sessionId: s.sessionId,
      templateId: s.templateId,
      ratio: s.ratio,
      platform: s.platform,
      slides: s.slides,
      watermark: s.watermark,
    })),
  );
  const prev = useWizardStore((s) => s.prev);
  const reset = useWizardStore((s) => s.reset);
  const [result, setResult] = useState<PersistResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moderation, setModeration] = useState<ModerationResp | null>(null);

  async function checkModerationFirst(): Promise<boolean> {
    const text = slides.map((s) => `${s.title}\n${s.body}`).join('\n');
    try {
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, sensitiveTopics: [] }),
      });
      const j = (await res.json()) as ModerationResp;
      if (!j.ok) {
        setModeration(j);
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  async function publish(skipModeration = false) {
    if (!templateId) return;
    setLoading(true);
    setError(null);
    setModeration(null);
    try {
      if (!skipModeration) {
        const passed = await checkModerationFirst();
        if (!passed) {
          setLoading(false);
          return;
        }
      }
      const idempotencyKey = `${sessionId}:${Date.now()}`;
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          templateId,
          ratio,
          platform,
          slides,
          watermark,
          idempotencyKey,
        }),
      });
      const j = (await res.json()) as PersistResult;
      setResult(j);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="step5" className="space-y-6">
      <header>
        <h2 id="step5" className="text-2xl font-bold text-ink tracking-[-0.01em]">
          5. 발행
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          검토 → 캡션 생성 → S3 업로드 → Airtable 저장 (Saga 5-step).
        </p>
      </header>
      {!result && !moderation ? (
        <div className="space-y-3">
          <SagaPipelinePreview running={loading} />
          <AuroraButton
            onClick={() => publish(false)}
            disabled={loading || slides.length === 0}
            variant="primary"
            style={{ padding: '12px 22px', fontSize: 14 }}>
            <Cloud size={14} strokeWidth={1.6} />
            {loading ? '검토 + Saga 실행 중...' : '발행하기'}
          </AuroraButton>
        </div>
      ) : null}
      {moderation && !moderation.ok ? <ModerationCard message={moderation.userMessage ?? ''} onForce={() => publish(true)} onEdit={() => { setModeration(null); prev(); }} /> : null}
      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-[12px] border p-3 text-sm" style={{ background: 'rgba(240,74,107,.06)', borderColor: 'rgba(240,74,107,.2)', color: 'var(--aurora-danger)' }}>
          <AlertTriangle size={16} strokeWidth={1.6} />
          <span className="font-medium">오류: {error}</span>
        </div>
      ) : null}
      {result ? <PublishResultCard result={result} /> : null}
      <div className="flex justify-between pt-2">
        <AuroraButton onClick={prev} variant="ghost" style={{ padding: '10px 16px' }}>
          ← 이전
        </AuroraButton>
        {result?.status === 'success' ? (
          <AuroraButton onClick={reset} variant="primary" style={{ padding: '12px 22px', fontSize: 14 }}>
            새 카루셀 만들기
            <ArrowRight size={14} strokeWidth={1.6} />
          </AuroraButton>
        ) : null}
      </div>
    </section>
  );
}

function SagaPipelinePreview({ running }: { running: boolean }) {
  return (
    <div className="aurora-card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">Saga 파이프라인</span>
        <AuroraChip>5-step · 보상 가능</AuroraChip>
      </div>
      <ol className="space-y-2">
        {SAGA_STEPS.map((s) => (
          <li key={s.k} className="flex items-center gap-3 text-sm text-ink-2">
            <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full font-mono text-[10px] font-semibold" style={{ background: running ? 'rgba(124,92,255,.12)' : 'var(--aurora-surface-2)', color: 'var(--aurora-ink-3)' }}>{s.k}</span>
            <span>{s.t}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// PublishResultCard — Saga 결과 톤 분리 (success=mint / partial=amber / orphan=danger).
// aurora-3.jsx Saga 결과 패턴 흡수. Loop 2 Fix F1 분리.
function PublishResultCard({ result }: { result: PersistResult }) {
  if (result.status === 'success' && result.carousel) {
    return (
      <div className="aurora-card space-y-2 p-4" style={{ background: 'rgba(70,224,198,.08)', borderColor: 'rgba(70,224,198,.3)' }}>
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          <Check size={16} strokeWidth={2} style={{ color: '#1d8a55' }} /> 발행 완료
        </p>
        <p className="font-mono text-xs text-ink-2">Airtable id: {result.carousel.id}</p>
        <ul className="space-y-1 text-xs text-ink-2">
          {result.carousel.s3Urls.map((u, i) => (
            <li key={i} className="font-mono break-all">{u}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (result.status === 'partial') {
    return (
      <div className="aurora-card p-4 text-sm text-ink-2" role="alert" style={{ background: 'rgba(255,181,71,.08)', borderColor: 'rgba(255,181,71,.3)' }}>
        부분 실패 ({result.failedAt}). retryToken: <span className="font-mono">{result.retryToken}</span>
      </div>
    );
  }
  if (result.status === 'orphan') {
    return (
      <div className="aurora-card p-4 text-sm text-ink" role="alert" style={{ background: 'rgba(240,74,107,.08)', borderColor: 'rgba(240,74,107,.3)' }}>
        orphan queue: <span className="font-mono">{result.orphanQueueId}</span> — 운영자 수동 확인 필요.
      </div>
    );
  }
  return null;
}

function ModerationCard({ message, onForce, onEdit }: { message: string; onForce: () => void; onEdit: () => void }) {
  return (
    <div role="alertdialog" aria-labelledby="mod-msg" className="aurora-card space-y-3 p-4" style={{ background: 'rgba(240,74,107,.06)', borderColor: 'rgba(240,74,107,.25)' }}>
      <div className="flex items-center gap-2">
        <Shield size={18} strokeWidth={1.6} style={{ color: 'var(--aurora-danger)' }} />
        <span className="text-sm font-bold text-ink">발행 보류 (Moderation)</span>
      </div>
      <p id="mod-msg" className="text-sm text-ink-2 leading-relaxed">{message}</p>
      <div className="flex gap-2">
        <AuroraButton onClick={onForce} variant="primary" style={{ padding: '8px 14px', fontSize: 13 }}>그대로 발행</AuroraButton>
        <AuroraButton onClick={onEdit} variant="ghost" style={{ padding: '8px 14px', fontSize: 13 }}>본문 수정</AuroraButton>
      </div>
    </div>
  );
}
