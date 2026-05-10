// ITemplateRepo — Templates BC
import type { UUID, AspectRatio } from '@/types/foundation';

export interface TemplateRecord {
  id: UUID;
  name: string;
  description: string;
  ratios: AspectRatio[];
  thumbnailUrl?: string;
  tags: string[];
}

export interface ITemplateRepo {
  list(): Promise<TemplateRecord[]>;
  detect(brief: string): Promise<TemplateRecord | null>;
}
