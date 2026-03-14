'use client';

import { BookOpen } from 'lucide-react';
import type { PoemMatchData } from '@/types';

export function PoetryMatch({ poem }: { poem: PoemMatchData }) {
  const displayLines = poem.lines.slice(0, 6);
  const similarityPercent = Math.round(poem.similarity * 100);

  return (
    <div className="bg-elevated border border-border-subtle rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={14} className="text-accent-philosophy" />
        <h4 className="text-sm font-sans font-semibold text-text-primary">{poem.title}</h4>
      </div>
      <p className="text-xs font-mono text-text-muted mb-3">by {poem.author}</p>
      <div className="space-y-0.5 mb-3">
        {displayLines.map((line, i) => (
          <p key={i} className="text-sm text-text-secondary italic leading-relaxed">
            {line}
          </p>
        ))}
        {poem.lines.length > 6 && (
          <p className="text-xs text-text-muted italic">...</p>
        )}
      </div>
      <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
        {similarityPercent}% match
      </div>
    </div>
  );
}
