// AirtableCarouselRepo.ts — Airtable adapter for ICarouselRepo.
// 11 forward-compat fields (ARCH §3-8 / §14.7-15) round-trip via the encoder
// so series/repurpose/post-save edit features land with zero migration burden.
import type {
  ICarouselRepo,
  ListCarouselsArgs,
} from '../interfaces/ICarouselRepo.js';
import type {
  Carousel,
  CarouselCreate,
  CarouselPatch,
  CursorPage,
} from '../../types/domain.js';
import type {
  AirtableListResponse,
  AirtableRecord,
  AirtableCarouselFields,
} from '../../types/airtable.js';
import { airtableFetch } from '../../lib/airtable-client.js';
import { airtableToCarousel } from '../../lib/vendor-mapper.js';
import { encodeCarousel } from './airtable-encode.js';

const TABLE = 'Carousels';

// Cycle 2 Fix F4 (Review §M2): see AirtableKnowledgeRepo for the full
// rationale — escape backslash first, then quote forms, drop CR/LF.
function escape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/[\r\n]/g, ' ');
}

function buildFormula(args: ListCarouselsArgs): string | null {
  const clauses: string[] = [];
  if (args.seriesId) clauses.push(`{series_id}="${escape(args.seriesId)}"`);
  if (args.parentCarouselId)
    clauses.push(`{parent_carousel_id}="${escape(args.parentCarouselId)}"`);
  if (clauses.length === 0) return null;
  return clauses.length === 1 ? (clauses[0] ?? null) : `AND(${clauses.join(',')})`;
}

export class AirtableCarouselRepo implements ICarouselRepo {
  async list(args: ListCarouselsArgs): Promise<CursorPage<Carousel>> {
    const params = new URLSearchParams();
    params.set('pageSize', String(args.limit));
    if (args.cursor) params.set('offset', args.cursor);
    const formula = buildFormula(args);
    if (formula) params.set('filterByFormula', formula);
    const data = await airtableFetch<AirtableListResponse<AirtableCarouselFields>>(
      `/${TABLE}?${params.toString()}`,
    );
    return {
      items: data.records.map(airtableToCarousel),
      nextCursor: data.offset ?? null,
    };
  }

  async get(id: string): Promise<Carousel | null> {
    try {
      const rec = await airtableFetch<AirtableRecord<AirtableCarouselFields>>(`/${TABLE}/${id}`);
      return airtableToCarousel(rec);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async create(input: CarouselCreate): Promise<Carousel> {
    const rec = await airtableFetch<AirtableRecord<AirtableCarouselFields>>(`/${TABLE}`, {
      method: 'POST',
      body: JSON.stringify({ fields: encodeCarousel(input), typecast: true }),
    });
    return airtableToCarousel(rec);
  }

  async update(id: string, patch: CarouselPatch): Promise<Carousel> {
    const rec = await airtableFetch<AirtableRecord<AirtableCarouselFields>>(`/${TABLE}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: encodeCarousel(patch), typecast: true }),
    });
    return airtableToCarousel(rec);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await airtableFetch<{ deleted: boolean }>(`/${TABLE}/${id}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }
}

function isNotFound(err: unknown): boolean {
  const status = (err as { status?: number } | undefined)?.status;
  return status === 404;
}
