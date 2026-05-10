// HttpCarouselRepo — web → storage `/carousels`
// Cycle 2 Fix (F3, 🟠-4): upstream 응답 Zod parse.
// v1.0.1 contract gap fix:
//   storage CreateBody accepts {title, brief, templateId, content, s3Keys,
//   aspectRatio, watermarkEnabled, …} and replies with the full Carousel shape
//   ({id, recordId, brief, templateId, s3Keys, aspectRatio, createdAt, …}).
//   BFF interface (CarouselRecord/CarouselSaveInput) is the slim caller-facing
//   subset {title, ratios, platform, s3Urls, caption}. Translate in both
//   directions here so neither side has to know the other's vocabulary.
import { z } from 'zod';
import type {
  ICarouselRepo,
  CarouselRecord,
  CarouselSaveInput,
} from '@/repositories/interfaces/ICarouselRepo';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import type { UUID, AspectRatio, Platform } from '@/types/foundation';

// Storage's wire shape is wider than what BFF/Saga consumes — accept any
// extra forward-compat field (Cycle 3 brandDSLSnapshot, captionJson, ...) by
// allowing unknown keys to pass through `passthrough()`.
const StorageCarouselSchema = z
  .object({
    id: z.string(),
    recordId: z.string().optional(),
    title: z.string().optional(),
    brief: z.string().optional(),
    templateId: z.string().optional(),
    s3Keys: z.array(z.string()).optional(),
    aspectRatio: z.string().optional(),
    captionJson: z.unknown().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

const StorageCarouselListSchema = z.object({
  items: z.array(StorageCarouselSchema),
  nextCursor: z.string().nullable().optional(),
});

type StorageCarousel = z.infer<typeof StorageCarouselSchema>;

export class HttpCarouselRepo implements ICarouselRepo {
  constructor(private readonly client: IServiceClient) {}

  async list(
    cursor?: string,
    limit = 20,
  ): Promise<{ items: CarouselRecord[]; nextCursor?: string }> {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(limit));
    const raw = await this.client.getJson(
      `/carousels?${params}`,
      undefined,
      StorageCarouselListSchema,
    );
    return {
      items: raw.items.map((c) => storageToBff(c)),
      ...(raw.nextCursor ? { nextCursor: raw.nextCursor } : {}),
    };
  }

  async save(input: CarouselSaveInput): Promise<CarouselRecord> {
    // BFF → storage translation:
    //   ratios:[ratio]  → aspectRatio (storage stores a single ratio per record)
    //   s3Urls          → s3Keys (storage uses object keys, not URLs)
    //   caption         → captionJson (storage's forward-compat JSON column)
    //   platform        → no storage column — folded into captionJson for v1.0
    //                    (v1.1 will add a dedicated platform field).
    const wireBody = {
      title: input.title,
      brief: input.title,
      aspectRatio: input.ratios[0],
      s3Keys: input.s3Urls,
      ...(input.caption !== undefined || input.platform
        ? {
            captionJson: {
              caption: input.caption ?? '',
              platform: input.platform,
            },
          }
        : {}),
    };
    const raw = await this.client.postJson(
      '/carousels',
      wireBody,
      { headers: { 'idempotency-key': input.idempotencyKey } },
      StorageCarouselSchema,
    );
    return storageToBff(raw, input);
  }

  async get(id: UUID): Promise<CarouselRecord | null> {
    try {
      const raw = await this.client.getJson(
        `/carousels/${id}`,
        undefined,
        StorageCarouselSchema,
      );
      return storageToBff(raw);
    } catch {
      return null;
    }
  }
}

/** storage Carousel → BFF CarouselRecord (slim view). Falls back to caller-supplied
 *  input fields when storage's response omits a column (forward-compat columns
 *  may be empty on freshly-created records). */
function storageToBff(raw: StorageCarousel, input?: CarouselSaveInput): CarouselRecord {
  const captionJson = (raw.captionJson ?? {}) as { caption?: string; platform?: Platform };
  const ratio = (raw.aspectRatio ?? input?.ratios[0] ?? '1:1') as AspectRatio;
  return {
    id: raw.id as UUID,
    title: raw.title ?? raw.brief ?? input?.title ?? '',
    ratios: [ratio],
    platform: (captionJson.platform ?? input?.platform ?? 'instagram') as Platform,
    s3Urls: raw.s3Keys ?? input?.s3Urls ?? [],
    ...(captionJson.caption ? { caption: captionJson.caption } : input?.caption ? { caption: input.caption } : {}),
    createdAt: (raw.createdAt ?? new Date().toISOString()) as CarouselRecord['createdAt'],
  };
}
