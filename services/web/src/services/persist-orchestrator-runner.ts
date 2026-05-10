// services/persist-orchestrator-runner.ts — Cycle 3 B2: 50줄 룰 분리.
//   step loop 본체. orchestrator는 dedup/replay/compensate만.
import type {
  PersistInput, PersistResult, SagaStep,
} from '@/repositories/interfaces/IPersistOrchestrator';
import type { SagaStateStore } from '@/lib/saga-state-types';
import { type StepDeps, STEP_ORDER, uploadOne } from './persist-orchestrator-steps';
import { applyCaptionRules } from './caption-passthrough';

export interface RunnerDeps extends StepDeps { state: SagaStateStore }

export async function runFromStep(
  deps: RunnerDeps, id: string, input: PersistInput, fromIdx: number, prevS3Keys: string[],
  compensate: (id: string, s3Keys: string[], err: unknown) => Promise<PersistResult>,
): Promise<PersistResult> {
  const s3Keys: string[] = [...prevS3Keys];
  const advance = (step: SagaStep) => deps.state.update(id, { currentStep: step });
  let pngUrls: string[] | undefined;
  try {
    for (let i = Math.max(0, fromIdx); i < STEP_ORDER.length; i++) {
      const step = STEP_ORDER[i]!;
      advance(step);
      if (step === 'validate') {
        if (!input.slides.length) throw new Error('validate: no slides');
      } else if (step === 'render') {
        const rendered = await deps.render.render({
          templateId: input.templateId, ratio: input.ratio, slides: input.slides,
          ...(input.watermark !== undefined ? { watermark: input.watermark } : {}),
        });
        pngUrls = rendered.pngUrls;
      } else if (step === 'upload-blob') {
        if (!pngUrls) throw new Error('upload-blob: render result missing — replay too late');
        const uploads = await Promise.all(
          pngUrls.map((url, idx) => uploadOne(deps.blob, url, id, idx, input.idempotencyKey)),
        );
        uploads.forEach((u) => s3Keys.push(u.key));
        deps.state.update(id, { sideEffects: JSON.stringify({ s3Keys }) });
      } else if (step === 'caption') {
        const raw = await deps.llm.generateCaption({ slides: input.slides, platform: input.platform });
        const guarded = applyCaptionRules({ caption: raw.caption, hashtags: raw.hashtags, slides: input.slides });
        deps.state.update(id, { payload: JSON.stringify({
          ...input, _caption: guarded.caption, _hashtags: guarded.hashtags,
        }) });
      } else if (step === 'save-airtable') {
        const cap = JSON.parse(deps.state.get(id)?.payload ?? '{}') as { _caption?: string; _hashtags?: string[] };
        const captionWithTags = [cap._caption ?? '', ...(cap._hashtags ?? [])].filter(Boolean).join(' ').trim();
        const carousel = await deps.carousels.save({
          title: input.slides[0]?.title ?? 'Untitled',
          ratios: [input.ratio], platform: input.platform,
          s3Urls: s3Keys.map((k) => `s3://bucket/${k}`),
          caption: captionWithTags, idempotencyKey: input.idempotencyKey,
        });
        deps.state.update(id, {
          status: 'completed', sideEffects: JSON.stringify({ s3Keys, airtableId: carousel.id }),
        });
        return { status: 'success', carousel };
      }
    }
    return { status: 'orphan', orphanQueueId: id };
  } catch (err) {
    return compensate(id, s3Keys, err);
  }
}
