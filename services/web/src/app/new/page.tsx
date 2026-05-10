// /new — 위저드 진입 (5-step + ChatSidebar + 9-light banner) — Aurora swap Loop 2 Build 2026-05-10.
// 외장: Sidebar + TopBar (Loop 1 박제 컴포넌트 재사용) + grad-hero 배경 + aurora-card chrome.
import { WizardContainer } from '@/components/wizard/wizard-container';
import { ChatSidebar } from '@/components/chat-sidebar';
import { HealthDepsBanner } from '@/components/health-deps-banner';
import { BrandDslProvider } from '@/contexts/brand-dsl-context';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/top-bar';

export default function NewCarouselPage() {
  return (
    <BrandDslProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar activeIndex={0} />
        <div className="flex flex-1 flex-col">
          <TopBar
            crumbs={['새 카루셀', '위저드']}
            right={
              <span
                className="aurora-tag"
                style={{
                  background: 'rgba(124,92,255,.08)',
                  color: 'var(--aurora-violet-2)',
                  borderColor: 'rgba(124,92,255,.18)',
                }}>
                자동 저장
              </span>
            }
          />
          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-auto bg-grad-hero p-8">
              <div className="mx-auto w-full max-w-3xl space-y-4">
                <HealthDepsBanner />
                <WizardContainer />
              </div>
            </main>
            <ChatSidebar />
          </div>
        </div>
      </div>
    </BrandDslProvider>
  );
}
