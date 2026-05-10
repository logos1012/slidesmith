import type { Metadata } from 'next';
import '../styles/globals.css';
import { branding } from '@/lib/branding';

// Aurora root layout (Loop 1 Build 2026-05-10) — DESIGN-v3 §1 Aurora swap.
// Brand DSL Provider stub: 실제 fetch + Context 주입은 wizard 전용 (`/new` page).
export const metadata: Metadata = {
  title: `${branding.productName} — ${branding.tagline}`,
  description: branding.tagline,
  metadataBase: new URL('http://localhost:3000'),
};

// SSR flash 방지 inline script — 사용자 선택 테마를 페인트 전 적용 (DESIGN-v3 §1-2 Aurora dark variant).
// Cycle 1 Fix (F8): 첫 방문자(`!t`)도 system fallback으로 prefers-color-scheme 적용.
const themeBootstrap = `
(function(){try{var t=localStorage.getItem('theme');var dark=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme:dark)').matches);if(dark){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="bg-bg text-text antialiased font-sans">{children}</body>
    </html>
  );
}
