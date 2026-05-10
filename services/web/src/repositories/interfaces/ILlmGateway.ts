// ILlmGateway — llm 서비스 (chat/content/caption/moderation/image)
// SSE는 Response stream으로 노출 (BFF relay).
import type { AspectRatio, Platform } from '@/types/foundation';

export interface ChatStreamInput {
  message: string;
  context?: string;
  sessionId: string;
}

export interface ContentGenerateInput {
  brief: string;
  templateId?: string;
  ratio: AspectRatio;
  slideCount: number;
}

export interface ContentSlide {
  index: number;
  title: string;
  body: string;
  imageHint?: string;
}

export interface CaptionInput {
  slides: ContentSlide[];
  platform: Platform;
}

export interface ModerationResult {
  ok: boolean;
  flaggedTerms: string[];
  guidance?: string;
}

export interface ILlmGateway {
  chatStream(input: ChatStreamInput, signal?: AbortSignal): Promise<Response>;
  generateContent(input: ContentGenerateInput): Promise<{ slides: ContentSlide[] }>;
  generateCaption(input: CaptionInput): Promise<{ caption: string; hashtags: string[] }>;
  moderate(text: string, sensitiveTopics: string[]): Promise<ModerationResult>;
}
