import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandDslProvider, useBrandDsl } from '@/contexts/brand-dsl-context';
import { SlidePreviewBoundary } from '@/components/slide-preview-boundary';

function Probe() {
  const { brand } = useBrandDsl();
  return (
    <SlidePreviewBoundary brand={brand}>
      <div data-testid="inner" />
    </SlidePreviewBoundary>
  );
}

describe('BrandDslProvider + SlidePreviewBoundary', () => {
  it('sets --brand-color-primary inline style on boundary', () => {
    render(
      <BrandDslProvider initial={{ primary: '#FF0', accent: '#0FF', surface: '#FFF', fontStack: 'sans' }}>
        <Probe />
      </BrandDslProvider>,
    );
    const inner = screen.getByTestId('inner');
    const wrapper = inner.parentElement as HTMLElement;
    expect(wrapper.classList.contains('slide-preview-container')).toBe(true);
    expect(wrapper.style.getPropertyValue('--brand-color-primary')).toBe('#FF0');
    expect(wrapper.style.getPropertyValue('--brand-font-stack')).toBe('sans');
  });

  it('throws when used outside provider', () => {
    expect(() => render(<Probe />)).toThrow();
  });
});
