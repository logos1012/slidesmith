// IPersistOrchestrator — Saga 5-step (validate → render → upload-blob → caption → save-airtable)
// SERVICE-web.md §5-3, ARCH-v3 §1-3 (8번째 인터페이스, web-internal).
import type { UUID, AspectRatio, Platform } from '@/types/foundation';
import type { ContentSlide } from '@/repositories/interfaces/ILlmGateway';
import type { CarouselRecord } from '@/repositories/interfaces/ICarouselRepo';

export type SagaStep =
  | 'validate'
  | 'render'
  | 'upload-blob'
  | 'caption'
  | 'save-airtable';

export type SagaStatus = 'pending' | 'running' | 'completed' | 'failed' | 'compensated';

export interface PersistInput {
  sessionId: UUID;
  templateId: string;
  ratio: AspectRatio;
  platform: Platform;
  slides: ContentSlide[];
  watermark?: boolean;
  idempotencyKey: string;
}

export interface PersistResult {
  status: 'success' | 'partial' | 'orphan';
  carousel?: CarouselRecord;
  failedAt?: SagaStep;
  retryToken?: string;
  orphanQueueId?: string;
}

export interface IPersistOrchestrator {
  /** 서버 시작 시 sqlite 미완료 saga 자동 복구. */
  recoverIncomplete(): Promise<{ recovered: number; orphaned: number }>;
  /** 5-step saga 실행. */
  persist(input: PersistInput): Promise<PersistResult>;
  /** 실패한 saga 재시도. */
  retry(retryToken: string): Promise<PersistResult>;
}
