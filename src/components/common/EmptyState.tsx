'use client';

import { Inbox, Search, FolderOpen, Globe } from 'lucide-react';
import { BoredSuggestion } from '@/components/enrichment/BoredSuggestion';

interface EmptyStateProps {
  variant: 'no-signals' | 'no-results' | 'no-category' | 'no-inbox';
  onAction?: () => void;
}

const configs = {
  'no-signals': {
    icon: Globe,
    title: 'No signals yet',
    description: 'Capture your first URL to start building your knowledge base.',
    actionLabel: 'Add URL',
  },
  'no-results': {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters.',
    actionLabel: undefined,
  },
  'no-category': {
    icon: FolderOpen,
    title: 'No signals in this category',
    description: 'Signals will appear here as you capture them.',
    actionLabel: undefined,
  },
  'no-inbox': {
    icon: Inbox,
    title: 'All caught up!',
    description: 'No signals waiting for triage.',
    actionLabel: undefined,
  },
};

export function EmptyState({ variant, onAction }: EmptyStateProps) {
  const config = configs[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Icon size={40} className="text-text-ghost" />
      <h3 className="text-base font-sans text-text-secondary">{config.title}</h3>
      <p className="text-xs font-mono text-text-muted max-w-xs text-center">{config.description}</p>
      {config.actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-3 px-4 py-2 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded-lg text-sm font-mono hover:bg-accent-primary/20 transition-colors"
        >
          {config.actionLabel}
        </button>
      )}
      {(variant === 'no-inbox' || variant === 'no-signals') && <BoredSuggestion />}
    </div>
  );
}
