// HttpCarouselRepo — web → storage `/carousels`
// Cycle 2 Fix (F3, 🟠-4): upstream 응답 Zod parse.
import type {
  ICarouselRepo,
  CarouselRecord,
  CarouselSaveInput,
} from '@/repositories/interfaces/ICarouselRepo';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import type { UUID } from '@/types/foundation';
import { CarouselListSchema, CarouselRecordSchema } from '@/lib/schemas/upstream.schema';

export class HttpCarouselRepo implements ICarouselRepo {
  constructor(private readonly client: IServiceClient) {}

  async list(
    cursor?: string,
    limit = 20,
  ): Promise<{ items: CarouselRecord[]; nextCursor?: string }> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(limit));
    const json = await this.client.getJson(
      `/carousels?${params}`,
      undefined,
      CarouselListSchema,
    );
    return json as { items: CarouselRecord[]; nextCursor?: string };
  }

  async save(input: CarouselSaveInput): Promise<CarouselRecord> {
    const json = await this.client.postJson(
      '/carousels',
      input,
      { headers: { 'idempotency-key': input.idempotencyKey } },
      CarouselRecordSchema,
    );
    return json as CarouselRecord;
  }

  async get(id: UUID): Promise<CarouselRecord | null> {
    try {
      const json = await this.client.getJson(
        `/carousels/${id}`,
        undefined,
        CarouselRecordSchema,
      );
      return json as CarouselRecord;
    } catch {
      return null;
    }
  }
}
