// Step 5 — 캡션 + S3 업로드 + Airtable 저장 (Saga)
// Cycle 2 Fix (F5, 🟠-6): individual selector + useShallow → 무관 필드 변경 시 re-render 0.
// Cycle 3 (A4): Moderation guard 박제. 발행 전 /api/moderation 호출 → flagged 시 confirm.
'use client';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWizardStore } from '@/stores/wizard-store';
import type { PersistResult } from '@/repositories/interfaces/IPersistOrchestrator';

interface ModerationResp { ok: boolean; userMessage: string | null; flaggedTerms: string[] }

export function Step5Publish() {
  const { sessionId, templateId, ratio, platform, slides, watermark } = useWizardStore(
    useShallow((s) => ({
      sessionId: s.sessionId, templateId: s.templateId, ratio: s.ratio,
      platform: s.platform, slides: s.slides, watermark: s.watermark,
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
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, sensitiveTopics: [] }),
      });
      const j = (await res.json()) as ModerationResp;
      if (!j.ok) { setModeration(j); return false; }
      return true;
    } catch {
      return true; // moderation 장애 시 saga 진행 (downstream에서 재검토).
    }
  }

  async function publish(skipModeration = false) {
    if (!templateId) return;
    setLoading(true); setError(null); setModeration(null);
    try {
      if (!skipModeration) {
        const passed = await checkModerationFirst();
        if (!passed) { setLoading(false); return; }
      }
      const idempotencyKey = `${sessionId}:${Date.now()}`;
      const res = await fetch('/api/save', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, templateId, ratio, platform, slides, watermark, idempotencyKey }),
      });
      const j = (await res.json()) as PersistResult;
      setResult(j);
    } catch (e) { setError(String(e)); } finally { setLoading(false); }
  }

  return (
    <section aria-labelledby="step5" className="space-y-6">
      <header><h2 id="step5" className="text-2xl font-semibold text-text">5. 발행</h2>
        <p className="text-sm text-text-muted">검토 → 캡션 생성 → S3 업로드 → Airtable 저장 (Saga 5-step).</p></header>
      {!result && !moderation ? (
        <button type="button" onClick={() => publish(false)} disabled={loading || slides.length === 0}
          className="bg-active text-active-text px-6 py-2 text-sm font-medium border border-border-strong disabled:opacity-50">
          {loading ? '검토 + Saga 실행 중...' : '발행하기'}
        </button>
      ) : null}
      {moderation && !moderation.ok ? (
        <div role="alertdialog" aria-labelledby="mod-msg" className="border border-border-strong p-4 space-y-3">
          <p id="mod-msg" className="text-sm text-text">{moderation.userMessage}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => publish(true)}
              className="bg-active text-active-text px-4 py-2 text-sm border border-border-strong">
              그대로 발행
            </button>
            <button type="button" onClick={() => { setModeration(null); prev(); }}
              className="px-4 py-2 text-sm border border-border text-text-muted">
              본문 수정
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-text" role="alert">오류: {error}</p> : null}
      {result?.status === 'success' && result.carousel ? (
        <div className="border border-border-strong p-4 space-y-2">
          <p className="text-sm font-semibold text-text">발행 완료</p>
          <p className="text-xs text-text-muted">Airtable id: {result.carousel.id}</p>
          <ul className="text-xs text-text-muted">
            {result.carousel.s3Urls.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      ) : null}
      {result?.status === 'partial' ? (
        <div className="border border-border p-4 text-sm text-text-muted" role="alert">
          부분 실패 ({result.failedAt}). retryToken: {result.retryToken}
        </div>
      ) : null}
      {result?.status === 'orphan' ? (
        <div className="border border-text p-4 text-sm text-text" role="alert">
          orphan queue: {result.orphanQueueId} — 운영자 수동 확인 필요.
        </div>
      ) : null}
      <div className="flex justify-between">
        <button type="button" onClick={prev} className="px-4 py-2 text-sm border border-border text-text-muted">← 이전</button>
        {result?.status === 'success' ? (
          <button type="button" onClick={reset}
            className="bg-active text-active-text px-6 py-2 text-sm font-medium border border-border-strong">
            새 카루셀 만들기
          </button>
        ) : null}
      </div>
    </section>
  );
}
