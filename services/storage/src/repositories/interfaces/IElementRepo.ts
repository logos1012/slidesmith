// IElementRepo.ts — server-side DIP.
import type {
  ElementItem,
  ElementCreate,
  ElementPatch,
  ElementType,
  ListPage,
} from '../../types/domain.js';

export interface ListElementsArgs {
  type?: ElementType;
  q?: string;
  limit: number;
  offset: number;
}

export interface IElementRepo {
  list(args: ListElementsArgs): Promise<ListPage<ElementItem>>;
  get(id: string): Promise<ElementItem | null>;
  create(input: ElementCreate): Promise<ElementItem>;
  update(id: string, patch: ElementPatch): Promise<ElementItem>;
  delete(id: string): Promise<boolean>;
}
