// /new — 위저드 진입 (5-step + ChatSidebar + 9-light banner)
import { WizardContainer } from '@/components/wizard/wizard-container';
import { ChatSidebar } from '@/components/chat-sidebar';
import { HealthDepsBanner } from '@/components/health-deps-banner';
import { BrandDslProvider } from '@/contexts/brand-dsl-context';

export default function NewCarouselPage() {
  return (
    <BrandDslProvider>
      <main className="min-h-screen flex flex-col">
        <HealthDepsBanner />
        <div className="flex flex-1">
          <section className="flex-1 px-6 py-8 max-w-3xl mx-auto w-full">
            <WizardContainer />
          </section>
          <ChatSidebar />
        </div>
      </main>
    </BrandDslProvider>
  );
}
