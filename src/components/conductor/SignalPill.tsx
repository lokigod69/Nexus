'use client';

import { getCategoryColor } from '@/lib/utils/categories';
import type { Category } from '@/types';

interface SignalPillProps {
  num: number;
  title: string;
  category: Category;
  onClick: () => void;
  onRequestDetail?: () => void;
}

export function SignalPill({ num, title, category, onClick, onRequestDetail }: SignalPillProps) {
  const color = getCategoryColor(category);
  const truncatedTitle = title.length > 35 ? title.substring(0, 35) + '...' : title;

  return (
    <span className="inline-flex items-center gap-1 mx-0.5 align-baseline">
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15 transition-all duration-200 cursor-pointer max-w-[260px]"
        style={{ borderLeft: `3px solid ${color}` }}
        title={title}
      >
        <span className="text-text-muted">[{num}]</span>
        <span className="text-text-secondary truncate">{truncatedTitle}</span>
      </button>
      {onRequestDetail && (
        <button
          onClick={(e) => { e.stopPropagation(); onRequestDetail(); }}
          className="text-[10px] text-text-ghost hover:text-accent transition-colors cursor-pointer"
          title="Load full details"
        >
          → Details
        </button>
      )}
    </span>
  );
}
