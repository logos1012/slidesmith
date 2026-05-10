// services/persist-orchestrator-steps.ts — Cycle 3 A2: Saga step replay.
//   각 step의 (advance + 실행 + side-effect 기록)을 단일 함수로 분리.
//   recoverIncomplete가 currentStep을 보고 정확히 어느 지점부터 재실행할지 결정.
import type { PersistInput, SagaStep } from '@/repositories/interfaces/IPersistOrchestrator';
import type { ILlmGateway } from '@/repositories/interfaces/ILlmGateway';
import type { IRenderGateway } from '@/repositories/interfaces/IRenderGateway';
import type { IBlobStorage } from '@/repositories/interfaces/IBlobStorage';
import type { ICarouselRepo } from '@/repositories/interfaces/ICarouselRepo';

export interface StepDeps {
  llm: ILlmGateway;
  render: IRenderGateway;
  blob: IBlobStorage;
  carousels: ICarouselRepo;
}

export interface StepContext {
  sagaId: string;
  input: PersistInput;
  s3Keys: string[];
  pngUrls?: string[];
  caption?: string;
  carouselId?: string;
}

/** Saga 전 step 순서 — replay 시 currentStep index 기준 재진입. */
export const STEP_ORDER: SagaStep[] = [
  'validate', 'render', 'upload-blob', 'caption', 'save-airtable',
];

export function stepIndex(step: SagaStep): number {
  return STEP_ORDER.indexOf(step);
}

export async function uploadOne(
  blob: IBlobStorage,
  url: string,
  sagaId: string,
  idx: number,
  key: string,
) {
  const data = await fetch(url).then((r) => r.arrayBuffer());
  return blob.upload({
    key: `carousels/${sagaId}/${idx}.png`, contentType: 'image/png',
    data, idempotencyKey: `${key}:${idx}`,
  });
}
