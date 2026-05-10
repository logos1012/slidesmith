import type { Metadata } from 'next';
import '../styles/globals.css';
import { branding } from '@/lib/branding';

// Brand DSL Provider stub: Cycle 2에서 실제 fetch + Context 주입.
// Cycle 1에서는 정적 metadata + body 렌더만.
export const metadata: Metadata = {
  title: `${branding.productName} — ${branding.tagline}`,
  description: branding.tagline,
  metadataBase: new URL('http://localhost:3000'),
};

// SSR flash 방지 inline script — 사용자 선택 테마를 페인트 전 적용 (DESIGN-v3 §1-2)
// Cycle 1 Fix (F8): Review 🟠-5 — 첫 방문자(`!t`)도 system fallback으로 prefers-color-scheme 적용.
// 이전 버그: t==null + 시스템 다크 → 라이트 페인트 발생.
const themeBootstrap = `
(function(){try{var t=localStorage.getItem('theme');var dark=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme:dark)').matches);if(dark){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
