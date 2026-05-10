// IElementRepo — Elements BC (이미지 슬롯 캐릭터/오브젝트)
import type { UUID } from '@/types/foundation';

export type ElementType = 'character' | 'object' | 'background';

export interface ElementRecord {
  id: UUID;
  type: ElementType;
  name: string;
  url: string;
  tags: string[];
}

export interface IElementRepo {
  list(type?: ElementType, q?: string): Promise<ElementRecord[]>;
  matchForSlide(slideText: string): Promise<ElementRecord[]>;
}
