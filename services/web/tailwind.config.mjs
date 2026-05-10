/** @type {import('tailwindcss').Config} */
// DESIGN-v3 §1-4: 도구 UI = monochrome editorial (white/black/gray만)
// Tailwind 기본 컬러 family (red/blue/green/yellow/orange/purple/pink/indigo) 모두 제거.
// brand color는 .slide-preview-container 자손에서만 (--brand-color-* namespace, Cycle 2 도입).
const config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    // 기본 컬러 family 제거 — semantic 토큰만 노출
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--color-bg)',
      surface: 'var(--color-surface)',
      'surface-2': 'var(--color-surface-2)',
      text: 'var(--color-text)',
      'text-muted': 'var(--color-text-muted)',
      'text-subtle': 'var(--color-text-subtle)',
      border: 'var(--color-border)',
      'border-strong': 'var(--color-border-strong)',
      hover: 'var(--color-hover)',
      active: 'var(--color-active)',
      'active-text': 'var(--color-active-text)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      error: 'var(--color-error)',
      info: 'var(--color-info)',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
