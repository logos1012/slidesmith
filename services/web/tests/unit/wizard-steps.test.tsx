import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useWizardStore } from '@/stores/wizard-store';
import { BrandDslProvider } from '@/contexts/brand-dsl-context';
import { Step2Template } from '@/components/wizard/step-2-template';
import { Step3Content } from '@/components/wizard/step-3-content';
import { Step4Preview } from '@/components/wizard/step-4-preview';
import { Step5Publish } from '@/components/wizard/step-5-publish';
import { ChatSidebar } from '@/components/chat-sidebar';

beforeEach(() => useWizardStore.getState().reset());

function withBrand(node: React.ReactNode) {
  return render(<BrandDslProvider>{node}</BrandDslProvider>);
}

describe('Wizard steps render + basic interactions', () => {
  it('Step2Template fetches templates and renders empty state', async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ items: [] }))) as typeof fetch;
    withBrand(<Step2Template />);
    await waitFor(() => expect(screen.getByText(/사용 가능한 템플릿이 없습니다/)).toBeDefined());
  });

  it('Step3Content shows generate button when templateId set', () => {
    useWizardStore.getState().setBrief('hello world');
    useWizardStore.getState().setTemplate('t1');
    withBrand(<Step3Content />);
    expect(screen.getByText('AI로 초안 생성')).toBeDefined();
  });

  it('Step3Content generate populates slides via /api/content/generate (Cycle 3 A6)', async () => {
    const mockSlides = Array.from({ length: 5 }, (_, i) => ({
      index: i, title: `t${i}`, body: `b${i}`,
    }));
    globalThis.fetch = (async () => new Response(JSON.stringify({ slides: mockSlides }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })) as typeof fetch;
    useWizardStore.getState().setBrief('topic of interest');
    useWizardStore.getState().setTemplate('t1');
    withBrand(<Step3Content />);
    fireEvent.click(screen.getByText('AI로 초안 생성'));
    await waitFor(() => expect(useWizardStore.getState().slides.length).toBe(5));
  });

  it('Step4Preview renders render button when templateId set', () => {
    useWizardStore.getState().setTemplate('t1');
    useWizardStore.getState().setSlides([{ index: 0, title: 't', body: 'b' }]);
    withBrand(<Step4Preview />);
    expect(screen.getByText('render 호출')).toBeDefined();
  });

  it('Step5Publish renders publish button when slides exist', () => {
    useWizardStore.getState().setTemplate('t1');
    useWizardStore.getState().setSlides([{ index: 0, title: 't', body: 'b' }]);
    withBrand(<Step5Publish />);
    expect(screen.getByText('발행하기')).toBeDefined();
  });

  it('ChatSidebar renders empty hint and input', () => {
    withBrand(<ChatSidebar />);
    expect(screen.getByText(/위저드 진행 중/)).toBeDefined();
    expect(screen.getByLabelText('message input')).toBeDefined();
  });

  it('ChatSidebar sends message and appends to messages', async () => {
    const enc = new TextEncoder();
    globalThis.fetch = (async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(enc.encode('hello')); controller.close(); },
    }))) as typeof fetch;
    withBrand(<ChatSidebar />);
    fireEvent.change(screen.getByLabelText('message input'), { target: { value: 'hi' } });
    fireEvent.click(screen.getByText('전송'));
    await waitFor(() => expect(screen.getByText('hello')).toBeDefined());
  });
});
