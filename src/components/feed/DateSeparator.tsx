'use client';

import { isToday, isYesterday, format } from 'date-fns';
import { getCategoryColor } from '@/lib/utils/categories';
import type { Signal } from '@/types';

export function DateSeparator({ date, signalCount, signals }: { date: string; signalCount?: number; signals?: Signal[] }) {
  const d = new Date(date);
  let label: string;

  if (isToday(d)) {
    label = 'today';
  } else if (isYesterday(d)) {
    label = 'yesterday';
  } else {
    label = format(d, 'MMMM d').toLowerCase();
  }

  // Build category dot breakdown
  const categoryDots: { color: string; count: number }[] = [];
  if (signals && signals.length > 0) {
    const counts: Record<string, number> = {};
    for (const s of signals) {
      counts[s.category] = (counts[s.category] || 0) + 1;
    }
    // Sort by count descending for visual weight
    for (const [cat, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      categoryDots.push({ color: getCategoryColor(cat), count });
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 pt-8 pb-5">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 date-line-gradient" />
        <span className="text-xs font-mono text-text-muted whitespace-nowrap" style={{ letterSpacing: '2px' }}>
          {label}
          {signalCount !== undefined && (
            <span className="text-text-ghost"> &middot; {signalCount} signal{signalCount !== 1 ? 's' : ''}</span>
          )}
        </span>
        <div className="flex-1 date-line-gradient" />
      </div>
      {categoryDots.length > 0 && (
        <div className="flex items-center gap-[2px]">
          {categoryDots.map(({ color, count }, i) => (
            Array.from({ length: count }).map((_, j) => (
              <span
                key={`${i}-${j}`}
                className="inline-block rounded-full"
                style={{
                  width: '4px',
                  height: '4px',
                  backgroundColor: color,
                  boxShadow: `0 0 3px ${color}40`,
                }}
              />
            ))
          ))}
        </div>
      )}
    </div>
  );
}
