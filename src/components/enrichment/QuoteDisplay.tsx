'use client';

import { useState, useEffect, useCallback } from 'react';
import type { QuoteData } from '@/types';

interface QuoteDisplayProps {
  quotes: QuoteData[];
}

export function QuoteDisplay({ quotes }: QuoteDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    quotes.length > 0 ? Math.floor(Math.random() * quotes.length) : 0
  );
  const [visible, setVisible] = useState(true);

  const cycle = useCallback(() => {
    if (quotes.length <= 1) return;
    setVisible(false);
    setTimeout(() => {
      setCurrentIndex(prev => {
        let next = Math.floor(Math.random() * quotes.length);
        while (next === prev && quotes.length > 1) {
          next = Math.floor(Math.random() * quotes.length);
        }
        return next;
      });
      setVisible(true);
    }, 400);
  }, [quotes.length]);

  useEffect(() => {
    if (quotes.length <= 1) return;
    const interval = setInterval(cycle, 5000);
    return () => clearInterval(interval);
  }, [cycle, quotes.length]);

  if (!quotes || quotes.length === 0) return null;

  const quote = quotes[currentIndex];
  if (!quote) return null;

  return (
    <div
      className="transition-opacity duration-400 ease-in-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <p className="text-xs italic text-text-secondary leading-relaxed">
        &ldquo;{quote.text}&rdquo;
      </p>
      <span className="text-[10px] font-mono text-text-muted mt-1 block">
        — {quote.author}
      </span>
    </div>
  );
}
