// HttpLlmGateway — web → llm 서비스
// Cycle 2 Fix (F3, 🟠-4): upstream JSON 응답 Zod parse (chat SSE는 stream이라 제외).
//   chatStream IServiceClient 우회 정리는 🟡-8 (Cycle 3 circuit breaker 작업)에 묶임.
// v1.0.1 contract gap fix:
//   llm /caption/generate now returns the rich Cycle 3 shape
//   { caption, hashtags: { highReach, medium, niche }, platformVariants, … }
//   instead of the v1.0 stub { caption, hashtags: string[] }. Translate here so
//   the Saga keeps its slim view.
import { z } from 'zod';
import type {
  ILlmGateway,
  ChatStreamInput,
  ContentGenerateInput,
  ContentSlide,
  CaptionInput,
  ModerationResult,
} from '@/repositories/interfaces/ILlmGateway';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import { ModerationResultSchema } from '@/lib/schemas/upstream.schema';

// Accept both shapes:
//   - legacy stub: { caption, hashtags: string[] }
//   - llm v1: { caption, hashtags: { highReach, medium, niche }, … }
const HashtagsSchema = z.union([
  z.array(z.string()),
  z.object({
    highReach: z.array(z.string()).optional(),
    medium: z.array(z.string()).optional(),
    niche: z.array(z.string()).optional(),
  }),
]);
const CaptionWireSchema = z.object({
  caption: z.string(),
  hashtags: HashtagsSchema,
}).passthrough();

function flattenHashtags(h: z.infer<typeof HashtagsSchema>): string[] {
  if (Array.isArray(h)) return h;
  return [...(h.highReach ?? []), ...(h.medium ?? []), ...(h.niche ?? [])];
}

// llm v1 returns slides without `index`, with optional `caption`. Coerce to BFF
// ContentSlide shape (index from array position, drop caption — Saga uses it
// only at /caption/generate time).
const LlmContentSlideSchema = z.object({
  title: z.string(),
  body: z.string(),
}).passthrough();
const ContentWireSchema = z.object({
  slides: z.array(LlmContentSlideSchema).min(1),
}).passthrough();

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
    // v1.0.1: llm /content/generate's body is { topic, slideCount, tone?, language? }.
    //   BFF sends { brief, templateId?, ratio, slideCount } — translate brief→topic
    //   here; ratio/templateId not consumed by llm so drop them.
    const wireBody = {
      topic: input.brief,
      slideCount: input.slideCount,
    };
    const r = await this.client.postJson(
      '/content/generate', wireBody, { timeoutMs: 60_000 }, ContentWireSchema,
    );
    return {
      slides: r.slides.map((s, idx): ContentSlide => ({
        index: idx,
        title: s.title,
        body: s.body,
      })),
    };
  }

  async generateCaption(input: CaptionInput): Promise<{ caption: string; hashtags: string[] }> {
    // BFF Platform enum is {instagram, threads, twitter}; llm enum is
    // {instagram, linkedin, threads}. Map twitter → instagram (closest media
    // shape — single short caption + hashtags) so the call doesn't 400.
    const platform = input.platform === 'twitter' ? 'instagram' : input.platform;
    const wire = await this.client.postJson(
      '/caption/generate',
      { slides: input.slides, platform },
      { timeoutMs: 30_000 },
      CaptionWireSchema,
    );
    return { caption: wire.caption, hashtags: flattenHashtags(wire.hashtags) };
  }

  async moderate(text: string, sensitiveTopics: string[]): Promise<ModerationResult> {
    const r = await this.client.postJson(
      '/moderation/check', { text, sensitiveTopics }, undefined, ModerationResultSchema,
    );
    return r as ModerationResult;
  }
}
