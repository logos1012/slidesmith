// Aurora Landing Demo Card (carousel design/aurora-1.jsx Demo card 흡수).
// 5-step pipeline 미리보기 + slide mini thumbnail row.
import { ArrowRight } from 'lucide-react';

const STEPS = ['1줄 brief', 'frame', 'copy', 'visual', 'publish'] as const;

const SLIDES = [
  { idx: 1, title: '30대 직장인의 2시간 아침 루틴', sub: '놓치면 손해', accent: '#7c5cff' },
  { idx: 2, title: '새벽 5시 기상의 진짜 이유', sub: 'PAS — Problem', accent: '#9d6bff' },
  { idx: 3, title: '3가지 핵심 습관', sub: 'PAS — Solution', accent: '#c25dff' },
  { idx: 4, title: '실제 21일 결과', sub: '증거', accent: '#ff5cb1' },
  { idx: 5, title: '오늘 시작해 보세요', sub: 'CTA', accent: '#ff6b9d' },
] as const;

export function LandingDemoCard() {
  return (
    <div className="aurora-glass p-[18px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => {
            const last = i === STEPS.length - 1;
            return (
              <span key={s} className="flex items-center gap-1.5">
                <span
                  className="aurora-tag"
                  style={
                    last
                      ? {
                          background: 'var(--grad-button)',
                          color: '#fff',
                          borderColor: 'transparent',
                          fontWeight: 600,
                        }
                      : { background: '#fff' }
                  }>
                  {s}
                </span>
                {!last ? <ArrowRight size={12} strokeWidth={1.6} className="text-ink-3" /> : null}
              </span>
            );
          })}
        </div>
        <span className="font-mono text-[10px] text-ink-3">04:32 elapsed</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {SLIDES.map((s) => (
          <div
            key={s.idx}
            className="relative shrink-0 overflow-hidden rounded-[10px] text-white shadow-[0_4px_14px_-8px_rgba(0,0,0,.25)]"
            style={{
              width: 120,
              height: 200,
              background: `linear-gradient(160deg, ${s.accent} 0%, ${s.accent}cc 100%)`,
            }}>
            <span className="absolute left-2.5 top-2 font-mono text-[9px] opacity-75">
              {String(s.idx).padStart(2, '0')} / 05
            </span>
            <div className="absolute bottom-3 left-2.5 right-2.5">
              <p className="mb-1 text-[13px] font-bold leading-[1.2]">{s.title}</p>
              <p className="text-[9px] leading-[1.4] opacity-80">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
