// ICarouselRepo — Carousels BC (write CRUD = save Saga)
import type { UUID, IsoDateTime, AspectRatio, Platform } from '@/types/foundation';

export interface CarouselRecord {
  id: UUID;
  title: string;
  ratios: AspectRatio[];
  platform: Platform;
  s3Urls: string[];
  caption?: string;
  createdAt: IsoDateTime;
}

export interface CarouselSaveInput {
  title: string;
  ratios: AspectRatio[];
  platform: Platform;
  s3Urls: string[];
  caption?: string;
  idempotencyKey: string;
}

export interface ICarouselRepo {
  list(cursor?: string, limit?: number): Promise<{ items: CarouselRecord[]; nextCursor?: string }>;
  save(input: CarouselSaveInput): Promise<CarouselRecord>;
  get(id: UUID): Promise<CarouselRecord | null>;
}
