import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WizardContainer } from '@/components/wizard/wizard-container';
import { useWizardStore } from '@/stores/wizard-store';
import { BrandDslProvider } from '@/contexts/brand-dsl-context';

beforeEach(() => useWizardStore.getState().reset());

function renderTree() {
  return render(
    <BrandDslProvider>
      <WizardContainer />
    </BrandDslProvider>,
  );
}

describe('WizardContainer 5-step', () => {
  it('starts on step 1 (주제 입력)', () => {
    renderTree();
    expect(screen.getByText('1. 주제 입력')).toBeDefined();
  });

  it('disables Next button until brief ≥ 5 chars', () => {
    renderTree();
    const next = screen.getByText('다음 → 템플릿 선택') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText(/예:/), { target: { value: 'hello world' } });
    expect((screen.getByText('다음 → 템플릿 선택') as HTMLButtonElement).disabled).toBe(false);
  });

  it('progress strip shows 5 steps', () => {
    renderTree();
    for (const label of ['주제', '템플릿', '본문', '미리보기', '발행']) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });
});
