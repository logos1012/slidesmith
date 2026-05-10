// Aurora Landing Insights — 최근 카루셀 + 이번 주 통계 (carousel design/aurora-1.jsx 흡수).
// Loop 1 = static demo data. Loop 2에서 실제 storage 연결.
import { Zap } from 'lucide-react';

const RECENT = [
  { t: '직장인 아침 루틴 BEST 5', d: '오늘 14:22', s: 'published', c: '#7c5cff' },
  { t: '맥북 초기 세팅 꿀팁', d: '어제 09:11', s: 'draft', c: '#ff6b9d' },
  { t: '사이드 프로젝트 6주 회고', d: '5/8', s: 'published', c: '#5cb8ff' },
] as const;

const STATS: Array<[string, string, number]> = [
  ['발행', '3 / 5', 60],
  ['평균 제작 시간', '4m 47s', 88],
  ['Brand DSL 일관도', '98%', 98],
];

export function LandingInsights() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_1fr]">
      <div className="aurora-card p-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-bold text-text">최근 카루셀</p>
          <span className="font-mono text-[10px] text-ink-3">12건</span>
        </div>
        {RECENT.map((r, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 py-2.5 ${i ? 'border-t border-line' : ''}`}>
            <span className="block h-10 w-8 shrink-0 rounded-[4px]" style={{ background: r.c }} />
            <div className="flex-1">
              <p className="text-xs font-semibold text-text">{r.t}</p>
              <p className="font-mono text-[10px] text-ink-3">{r.d}</p>
            </div>
            <span
              className="aurora-tag"
              style={{
                background:
                  r.s === 'published' ? 'rgba(43,182,115,.12)' : 'var(--aurora-surface-2)',
                color: r.s === 'published' ? '#1d8a55' : 'var(--aurora-ink-3)',
                borderColor: 'transparent',
                fontSize: 10,
              }}>
              {r.s}
            </span>
          </div>
        ))}
      </div>
      <div className="aurora-card p-[18px]">
        <p className="mb-3 text-[13px] font-bold text-text">이번 주</p>
        {STATS.map(([k, v, p]) => (
          <div key={k} className="mb-3">
            <div className="mb-1 flex justify-between text-[11px]">
              <span className="text-ink-2">{k}</span>
              <span className="font-mono font-semibold text-text">{v}</span>
            </div>
            <div className="aurora-bar">
              <i style={{ width: `${p}%` }} />
            </div>
          </div>
        ))}
        <div className="mt-3 rounded-[12px] bg-aurora-surface-2 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-text">
            <Zap size={11} strokeWidth={1.6} /> 이번 주 인사이트
          </p>
          <p className="text-[11px] leading-[1.5] text-ink-2">
            화요일 오전 9시 발행이 평균 +34% 도달. 내일 09:00 예약을 추천합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
