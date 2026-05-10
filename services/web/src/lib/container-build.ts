// lib/container-build.ts — DI Container build logic (Cycle 3 B2 분리)
//   container.ts는 singleton getter / setter / bootstrap만, 실제 wiring은 여기로.
import { env } from '@/lib/env';
import { FetchServiceClient } from '@/repositories/http/FetchServiceClient';
import { HttpKnowledgeRepo } from '@/repositories/http/HttpKnowledgeRepo';
import { HttpTemplateRepo } from '@/repositories/http/HttpTemplateRepo';
import { HttpCarouselRepo } from '@/repositories/http/HttpCarouselRepo';
import { HttpElementRepo } from '@/repositories/http/HttpElementRepo';
import { HttpBlobStorage } from '@/repositories/http/HttpBlobStorage';
import { HttpLlmGateway } from '@/repositories/http/HttpLlmGateway';
import { HttpRenderGateway } from '@/repositories/http/HttpRenderGateway';
import { PersistOrchestrator } from '@/services/persist-orchestrator';
import { createSagaStore } from '@/lib/saga-state';
import type { Container } from './container-types';

export function buildContainer(): Container {
  const storageClient = new FetchServiceClient(env.STORAGE_SERVICE_URL);
  const llmClient = new FetchServiceClient(env.LLM_SERVICE_URL);
  const renderClient = new FetchServiceClient(env.RENDER_SERVICE_URL);
  const knowledge = new HttpKnowledgeRepo(storageClient);
  const templates = new HttpTemplateRepo(storageClient);
  const carousels = new HttpCarouselRepo(storageClient);
  const elements = new HttpElementRepo(storageClient);
  const blob = new HttpBlobStorage(storageClient);
  const llm = new HttpLlmGateway(llmClient);
  const render = new HttpRenderGateway(renderClient);
  const sagaState = createSagaStore(env.SAGA_DB_PATH);
  const persist = new PersistOrchestrator({ llm, render, blob, carousels, state: sagaState });
  return { knowledge, templates, carousels, elements, blob, llm, render, persist, sagaState };
}
