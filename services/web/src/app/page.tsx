import Link from 'next/link';
import { branding } from '@/lib/branding';
import { HealthDepsBanner } from '@/components/health-deps-banner';

// Landing — DESIGN-v3 §3: 5초 hero copy + 단일 CTA (monochrome editorial)
// Cycle 2: HealthDepsBanner 9-light 박제 + /new 위저드 entry.
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="absolute top-0 left-0 right-0">
        <HealthDepsBanner />
      </div>
      <section className="max-w-2xl w-full text-center">
        <p className="text-text-subtle text-sm uppercase tracking-[0.2em] mb-6">
          {branding.productName}
        </p>
        <h1 className="text-text text-4xl md:text-5xl font-bold leading-tight mb-4">
          {branding.tagline}
        </h1>
        <p className="text-text-muted text-base md:text-lg mb-12">
          위저드 5단계로 인스타 카루셀을 발행 단계까지 끌고 갑니다.
        </p>
        <Link
          href="/new"
          className="inline-flex items-center justify-center rounded-md bg-active text-active-text px-8 py-3 text-base font-medium border border-border-strong hover:bg-text transition-colors"
        >
          + 새 카루셀 만들기
        </Link>
      </section>

      <footer className="absolute bottom-6 text-text-subtle text-xs">
        <a href={branding.githubRepo} target="_blank" rel="noreferrer" className="hover:text-text-muted">
          GitHub
        </a>
      </footer>
    </main>
  );
}
