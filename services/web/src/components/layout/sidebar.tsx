// Aurora Sidebar — 64px 좌측 nav (carousel design/aurora-1.jsx + shared.jsx Sidebar 흡수).
// 활성 항목: surface-2 배경 + 좌측 violet bar.
'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Plus, Layers, Sparkles, Cloud, Shield } from 'lucide-react';

export interface SidebarItem {
  icon: ReactNode;
  label: string;
  href: string;
}

const ICON_PROPS = { size: 18, strokeWidth: 1.6 } as const;

export const DEFAULT_SIDEBAR_ITEMS: SidebarItem[] = [
  { icon: <Plus {...ICON_PROPS} />, label: '만들기', href: '/new' },
  { icon: <Layers {...ICON_PROPS} />, label: '프로젝트', href: '/' },
  { icon: <Sparkles {...ICON_PROPS} />, label: 'Brand', href: '/' },
  { icon: <Cloud {...ICON_PROPS} />, label: 'Knowledge', href: '/' },
  { icon: <Shield {...ICON_PROPS} />, label: '보안', href: '/admin/security-checklist' },
];

interface Props {
  items?: SidebarItem[];
  activeIndex?: number;
}

export function Sidebar({ items = DEFAULT_SIDEBAR_ITEMS, activeIndex = 0 }: Props) {
  return (
    <nav
      aria-label="primary"
      className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-aurora-surface py-4">
      {items.map((it, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={it.label}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`relative grid h-11 w-11 place-items-center rounded-[10px] text-[9px] ${
              active ? 'bg-aurora-surface-2 text-ink' : 'text-ink-3 hover:bg-aurora-surface-2'
            }`}>
            {active ? (
              <span
                aria-hidden
                className="absolute left-[-1px] top-2 bottom-2 w-[3px] rounded-[2px] bg-violet"
              />
            ) : null}
            <span className="flex flex-col items-center gap-0.5">
              {it.icon}
              <span className="font-medium leading-none">{it.label}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
