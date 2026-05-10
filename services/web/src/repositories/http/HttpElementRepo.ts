// HttpElementRepo — web → storage `/elements`
// Cycle 2 Fix (F3, 🟠-4): upstream 응답 Zod parse.
import type { IElementRepo, ElementRecord, ElementType } from '@/repositories/interfaces/IElementRepo';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import { ElementListSchema } from '@/lib/schemas/upstream.schema';

export class HttpElementRepo implements IElementRepo {
  constructor(private readonly client: IServiceClient) {}

  async list(type?: ElementType, q?: string): Promise<ElementRecord[]> {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (q) params.set('q', q);
    const path = '/elements' + (params.toString() ? `?${params}` : '');
    const json = await this.client.getJson(path, undefined, ElementListSchema);
    return json.items as ElementRecord[];
  }

  async matchForSlide(slideText: string): Promise<ElementRecord[]> {
    const json = await this.client.postJson(
      '/elements/match',
      { slideText },
      undefined,
      ElementListSchema,
    );
    return json.items as ElementRecord[];
  }
}
