import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HealthDepsBanner } from '@/components/health-deps-banner';

beforeEach(() => {
  globalThis.fetch = (async () => new Response(JSON.stringify({
    web: { status: 'ok', responseMs: 0 },
    llm: { status: 'degraded', responseMs: 100 },
    render: { status: 'down', responseMs: 0 },
    storage: { status: 'ok', responseMs: 5 },
    external: {
      anthropic: { status: 'unknown', responseMs: 0 },
      airtable: { status: 'unknown', responseMs: 0 },
      s3: { status: 'unknown', responseMs: 0 },
      gemini: { status: 'unknown', responseMs: 0 },
    },
  }), { status: 200 })) as typeof fetch;
});

describe('HealthDepsBanner (9-light)', () => {
  it('renders all 9 services after first poll', async () => {
    render(<HealthDepsBanner pollMs={10_000} />);
    await waitFor(() => {
      expect(screen.getByText('web')).toBeDefined();
    });
    for (const k of ['web', 'llm', 'render', 'storage', 'anthropic', 'airtable', 's3', 'gemini', 'saga']) {
      expect(screen.getByText(k)).toBeDefined();
    }
  });
});

vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
