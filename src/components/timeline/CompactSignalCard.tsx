'use client';

import type { Signal } from '@/types';
import { getCategoryColor } from '@/lib/utils/categories';
import { format } from 'date-fns';

interface CompactSignalCardProps {
  signal: Signal;
  isSelected: boolean;
  onClick: () => void;
}

export function CompactSignalCard({ signal, isSelected, onClick }: CompactSignalCardProps) {
  const catColor = getCategoryColor(signal.category);
  const time = format(new Date(signal.createdAt), 'HH:mm');

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-elevated border-border-active shadow-md'
          : 'bg-surface border-border-subtle hover:border-border-active hover:bg-elevated/50'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: catColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-sans text-text-primary truncate">{signal.title}</p>
          {signal.summary && (
            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{signal.summary}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono text-text-ghost">{time}</span>
            <span className="text-[10px] font-mono text-text-ghost">{signal.source}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
