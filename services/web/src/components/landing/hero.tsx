// Aurora Landing Hero (carousel design/aurora-1.jsx AuroraLanding hero 흡수).
// gradient text "5분 카루셀" + 단일 primary CTA.
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { branding } from '@/lib/branding';

export function LandingHero() {
  return (
    <section className="pt-6 pb-7 text-center">
      <span className="aurora-tag mb-4 inline-flex" style={{ background: 'rgba(255,255,255,.6)', borderColor: 'rgba(124,92,255,.2)' }}>
        <Sparkles size={11} strokeWidth={1.6} /> v1.0.0 · Aurora · MIT
      </span>
      <h1 className="mx-auto mb-3.5 max-w-3xl text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] md:text-[52px]">
        한 줄을{' '}
        <span
          className="bg-grad-button bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          5분 카루셀
        </span>
        로,
        <br />
        한국 솔로 크리에이터를 위한 도구
      </h1>
      <p className="mx-auto mb-6 max-w-[540px] text-base leading-[1.5] text-ink-2">
        {branding.tagline}. PAS·AIDA·Cialdini 프레임워크가 카피를 깎아주고, Brand DSL이 톤·색·폰트를 자동으로 맞춥니다.
      </p>
      <div className="mb-1.5 flex justify-center gap-2.5">
        <Link
          href="/new"
          className="aurora-btn aurora-btn-primary"
          style={{ padding: '12px 22px', fontSize: 14 }}>
          <Sparkles size={14} strokeWidth={1.6} /> 새 카루셀 만들기
          <ArrowRight size={14} strokeWidth={1.6} />
        </Link>
        <a
          href={branding.githubRepo}
          target="_blank"
          rel="noreferrer"
          className="aurora-btn aurora-btn-ghost"
          style={{ padding: '12px 18px' }}>
          GitHub 둘러보기
        </a>
      </div>
      <p className="font-mono text-[11px] text-ink-3">⌘N · 평균 4분 47초 · 30개 해시태그 자동</p>
    </section>
  );
}
