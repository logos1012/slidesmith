// IKnowledgeRepo — Knowledge BC (ARCH-v3 §1-3)
// storage `/knowledge` 경유. lru-cache 5분은 storage 측. web은 fetch만.
import type { UUID } from '@/types/foundation';

export interface KnowledgeRecord {
  id: UUID;
  category: string;
  name: string;
  description: string;
  examples?: string[];
}

export interface KnowledgeQuery {
  category?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface IKnowledgeRepo {
  list(query?: KnowledgeQuery): Promise<KnowledgeRecord[]>;
  bySensitiveTopics(): Promise<KnowledgeRecord[]>;
}
