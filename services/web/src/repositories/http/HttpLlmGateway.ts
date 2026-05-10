// HttpLlmGateway — web → llm 서비스
// Cycle 2 Fix (F3, 🟠-4): upstream JSON 응답 Zod parse (chat SSE는 stream이라 제외).
//   chatStream IServiceClient 우회 정리는 🟡-8 (Cycle 3 circuit breaker 작업)에 묶임.
import type {
  ILlmGateway,
  ChatStreamInput,
  ContentGenerateInput,
  ContentSlide,
  CaptionInput,
  ModerationResult,
} from '@/repositories/interfaces/ILlmGateway';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import {
  CaptionResultSchema,
  ContentResultSchema,
  ModerationResultSchema,
} from '@/lib/schemas/upstream.schema';

export class HttpLlmGateway implements ILlmGateway {
  constructor(private readonly client: IServiceClient) {}

  chatStream(input: ChatStreamInput, signal?: AbortSignal): Promise<Response> {
    const headers = new Headers({ 'content-type': 'application/json', accept: 'text/event-stream' });
    return fetch(this.client.baseUrl + '/chat/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      ...(signal ? { signal } : {}),
    });
  }

  async generateContent(input: ContentGenerateInput): Promise<{ slides: ContentSlide[] }> {
    const r = await this.client.postJson(
      '/content/generate', input, { timeoutMs: 60_000 }, ContentResultSchema,
    );
    return r as { slides: ContentSlide[] };
  }

  async generateCaption(input: CaptionInput): Promise<{ caption: string; hashtags: string[] }> {
    return this.client.postJson(
      '/caption/generate', input, { timeoutMs: 30_000 }, CaptionResultSchema,
    );
  }

  async moderate(text: string, sensitiveTopics: string[]): Promise<ModerationResult> {
    const r = await this.client.postJson(
      '/moderation/check', { text, sensitiveTopics }, undefined, ModerationResultSchema,
    );
    return r as ModerationResult;
  }
}
