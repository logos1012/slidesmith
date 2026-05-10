// Aurora Logo (carousel design/shared.jsx Logo 흡수).
// 보라→핑크 그라데이션 박스 + 흰 안쪽 + 두 막대 (violet/pink).
import { branding } from '@/lib/branding';

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="relative shrink-0 rounded-md bg-grad-button shadow-button"
        style={{ width: size, height: size }}>
        <span className="absolute inset-1 rounded-[3px] bg-white opacity-90" />
        <span
          className="absolute rounded-[1px] bg-violet"
          style={{ left: 6, top: 6, width: 6, height: 14 }}
        />
        <span
          className="absolute rounded-[1px] bg-pink"
          style={{ right: 6, top: 6, width: 6, height: 14 }}
        />
      </span>
      <span className="font-semibold tracking-tight text-text">{branding.productName}</span>
    </div>
  );
}
