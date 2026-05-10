// Aurora Landing (Loop 1 Build 2026-05-10) — DESIGN-v3 §3 Aurora swap.
// carousel design/aurora-1.jsx AuroraLanding 흡수 + 한국어 카피 보존.
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { LandingHero } from '@/components/landing/hero';
import { LandingDemoCard } from '@/components/landing/demo-card';
import { LandingInsights } from '@/components/landing/insights-panel';
import { HealthDepsBanner } from '@/components/health-deps-banner';

export default function HomePage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar activeIndex={1} />
      <div className="flex flex-1 flex-col">
        <TopBar
          crumbs={['홈']}
          right={
            <>
              <span
                className="aurora-tag"
                style={{
                  background: 'rgba(124,92,255,.08)',
                  color: 'var(--aurora-violet-2)',
                  borderColor: 'rgba(124,92,255,.18)',
                }}>
                4 services healthy
              </span>
              <span
                aria-hidden
                className="block h-7 w-7 rounded-full bg-grad-button"
              />
            </>
          }
        />
        <div className="flex-1 overflow-auto bg-grad-hero p-8">
          <div className="mx-auto max-w-[920px]">
            <LandingHero />
            <LandingDemoCard />
            <LandingInsights />
            <div className="mt-6 aurora-card p-3.5">
              <HealthDepsBanner />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
