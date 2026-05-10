// IRenderGateway — render 서비스 (POST /render → ZIP)
import type { AspectRatio } from '@/types/foundation';
import type { ContentSlide } from '@/repositories/interfaces/ILlmGateway';

export interface BrandDsl {
  primary: string;
  accent: string;
  surface: string;
  fontStack: string;
}

export interface RenderInput {
  templateId: string;
  ratio: AspectRatio;
  slides: ContentSlide[];
  brand?: BrandDsl;
  watermark?: boolean;
}

export interface RenderResult {
  zipUrl: string;
  pngUrls: string[];
  durationMs: number;
}

export interface IRenderGateway {
  render(input: RenderInput): Promise<RenderResult>;
  preview(slideIndex: number, html: string): Promise<{ pngUrl: string }>;
}
