// HttpTemplateRepo — web → storage `/templates`
// Cycle 2 Fix (F3, 🟠-4): upstream 응답 Zod parse.
import type { ITemplateRepo, TemplateRecord } from '@/repositories/interfaces/ITemplateRepo';
import type { IServiceClient } from '@/repositories/interfaces/IServiceClient';
import { TemplateListSchema, TemplateDetectSchema } from '@/lib/schemas/upstream.schema';

export class HttpTemplateRepo implements ITemplateRepo {
  constructor(private readonly client: IServiceClient) {}

  async list(): Promise<TemplateRecord[]> {
    const json = await this.client.getJson('/templates', undefined, TemplateListSchema);
    return json.items as TemplateRecord[];
  }

  async detect(brief: string): Promise<TemplateRecord | null> {
    const json = await this.client.postJson(
      '/templates/detect',
      { brief },
      undefined,
      TemplateDetectSchema,
    );
    return json.template as TemplateRecord | null;
  }
}
