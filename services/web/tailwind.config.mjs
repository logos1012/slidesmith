/** @type {import('tailwindcss').Config} */
// DESIGN-v3 §1-4 (Aurora swap, Loop 1 Build 2026-05-10):
//   도구 UI = Aurora (vibrant gradient + glassy + creator-friendly).
//   기존 monochrome 정책 폐기 — D-aurora-1 결정 로그 참조.
//   Tailwind 기본 컬러 family는 여전히 노출 X (semantic 토큰 + Aurora 토큰만).
//   `--brand-color-*` 사용자 brand DSL은 .slide-preview-container 자손 한정 (Layer 1 그대로).
const config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      // ── Semantic tokens (Loop 2 wizard 호환 alias — globals.css 에서 Aurora 값 rebind) ──
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
      // ── Aurora canonical tokens (Landing/Layout/Sidebar/TopBar용) ──
      'aurora-bg': 'var(--aurora-bg)',
      'aurora-bg-deep': 'var(--aurora-bg-deep)',
      'aurora-surface': 'var(--aurora-surface)',
      'aurora-surface-2': 'var(--aurora-surface-2)',
      ink: 'var(--aurora-ink)',
      'ink-2': 'var(--aurora-ink-2)',
      'ink-3': 'var(--aurora-ink-3)',
      line: 'var(--aurora-line)',
      'line-2': 'var(--aurora-line-2)',
      violet: 'var(--aurora-violet)',
      'violet-2': 'var(--aurora-violet-2)',
      pink: 'var(--aurora-pink)',
      blue: 'var(--aurora-blue)',
      mint: 'var(--aurora-mint)',
      amber: 'var(--aurora-amber)',
      danger: 'var(--aurora-danger)',
    },
    extend: {
      backgroundImage: {
        'grad-hero': 'var(--grad-hero)',
        'grad-button': 'var(--grad-button)',
        'grad-card': 'var(--grad-card)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        button: 'var(--shadow-button)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
