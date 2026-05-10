// seed-templates-bundle.test.ts — verify the v1.0 default Templates bundle
// parses, ships at least 3 items, and toTemplateCreate maps every field
// correctly. Same shape as seed-bundle.test.ts (Knowledge).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadTemplatesDefault,
  toTemplateCreate,
  _resetTemplatesSeedCache,
} from '../../src/seed/load-templates-default.js';

describe('seed bundle — templates-default.json (v1.1.2)', () => {
  beforeEach(() => _resetTemplatesSeedCache());

  it('totalCount matches items.length and ships at least 3 templates', () => {
    const bundle = loadTemplatesDefault();
    expect(bundle.totalCount).toBe(bundle.items.length);
    expect(bundle.items.length).toBeGreaterThanOrEqual(3);
  });

  it('every item has the required Aurora-shape fields', () => {
    const bundle = loadTemplatesDefault();
    for (const item of bundle.items) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.narrative_arc.length).toBeGreaterThan(0);
      expect(Array.isArray(item.files)).toBe(true);
      expect(item.files.length).toBeGreaterThan(0);
      expect(item.version.length).toBeGreaterThan(0);
      // schema is unknown but must be non-null/undefined.
      expect(item.schema).toBeDefined();
      expect(item.schema).not.toBeNull();
    }
  });

  it('ships the three Aurora templates (Light / Vibrant / Editorial)', () => {
    const bundle = loadTemplatesDefault();
    const names = bundle.items.map((i) => i.name);
    expect(names).toEqual(
      expect.arrayContaining(['Aurora Light', 'Aurora Vibrant', 'Aurora Editorial']),
    );
  });

  it('caches the bundle (second call returns same reference)', () => {
    const a = loadTemplatesDefault();
    const b = loadTemplatesDefault();
    expect(a).toBe(b);
  });

  it('items have unique names (no upsert collisions)', () => {
    const bundle = loadTemplatesDefault();
    const seen = new Set<string>();
    for (const item of bundle.items) {
      expect(seen.has(item.name)).toBe(false);
      seen.add(item.name);
    }
  });

  it('toTemplateCreate maps narrative_arc → narrativeArc and preserves schema', () => {
    const bundle = loadTemplatesDefault();
    const item = bundle.items[0]!;
    const create = toTemplateCreate(item);
    expect(create.name).toBe(item.name);
    expect(create.schema).toBe(item.schema);
    expect(create.narrativeArc).toBe(item.narrative_arc);
    expect(create.files).toBe(item.files);
    expect(create.version).toBe(item.version);
    // raw `narrative_arc` must NOT survive on the vendor-neutral payload.
    expect(create).not.toHaveProperty('narrative_arc');
  });
});
