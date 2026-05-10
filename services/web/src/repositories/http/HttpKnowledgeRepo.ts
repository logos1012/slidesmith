// HttpKnowledgeRepo — web → storage `/knowledge`
// Cycle 2 Fix (F3, 🟠-4): upstream 응답 Zod parse (KnowledgeListSchema).
import type { IKnowledgeRepo, KnowledgeQuery, KnowledgeRecord } from '@/repositories/interfaces/IKnowledgeRepo';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import { KnowledgeListSchema } from '@/lib/schemas/upstream.schema';

export class HttpKnowledgeRepo implements IKnowledgeRepo {
  constructor(private readonly client: IServiceClient) {}

  async list(query: KnowledgeQuery = {}): Promise<KnowledgeRecord[]> {
    const params = new URLSearchParams();
    if (query.category) params.set('category', query.category);
    if (query.q) params.set('q', query.q);
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    if (query.offset !== undefined) params.set('offset', String(query.offset));
    const path = '/knowledge' + (params.toString() ? `?${params}` : '');
    const json = await this.client.getJson(path, undefined, KnowledgeListSchema);
    return json.items as KnowledgeRecord[];
  }

  bySensitiveTopics(): Promise<KnowledgeRecord[]> {
    return this.list({ category: 'SensitiveTopics' });
  }
}
