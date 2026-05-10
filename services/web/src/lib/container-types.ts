// lib/container-types.ts — DI Container shape (Cycle 3 B2 분리)
import type { IKnowledgeRepo } from '@/repositories/interfaces/IKnowledgeRepo';
import type { ITemplateRepo } from '@/repositories/interfaces/ITemplateRepo';
import type { ICarouselRepo } from '@/repositories/interfaces/ICarouselRepo';
import type { IElementRepo } from '@/repositories/interfaces/IElementRepo';
import type { IBlobStorage } from '@/repositories/interfaces/IBlobStorage';
import type { ILlmGateway } from '@/repositories/interfaces/ILlmGateway';
import type { IRenderGateway } from '@/repositories/interfaces/IRenderGateway';
import type { IPersistOrchestrator } from '@/repositories/interfaces/IPersistOrchestrator';
import type { SagaStateStore } from '@/lib/saga-state-types';

export interface Container {
  knowledge: IKnowledgeRepo;
  templates: ITemplateRepo;
  carousels: ICarouselRepo;
  elements: IElementRepo;
  blob: IBlobStorage;
  llm: ILlmGateway;
  render: IRenderGateway;
  persist: IPersistOrchestrator;
  sagaState: SagaStateStore;
}
