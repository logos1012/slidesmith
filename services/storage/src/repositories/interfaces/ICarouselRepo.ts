// ICarouselRepo.ts — server-side DIP.
// Day 1 schema = 11 forward-compat fields (ARCH §3-8 / §14.7-15) so v1.1·v1.5
// migration burden stays at zero.
import type {
  Carousel,
  CarouselCreate,
  CarouselPatch,
  CursorPage,
} from '../../types/domain.js';

export interface ListCarouselsArgs {
  cursor?: string;
  limit: number;
  /** Filter to a single Series (forward-compat read for v1.1). */
  seriesId?: string;
  /** Filter to a single parent (forward-compat read for v1.1 Repurpose). */
  parentCarouselId?: string;
}

export interface ICarouselRepo {
  list(args: ListCarouselsArgs): Promise<CursorPage<Carousel>>;
  get(id: string): Promise<Carousel | null>;
  create(input: CarouselCreate): Promise<Carousel>;
  update(id: string, patch: CarouselPatch): Promise<Carousel>;
  delete(id: string): Promise<boolean>;
}
