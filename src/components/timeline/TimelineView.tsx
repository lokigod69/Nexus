'use client';

import { useMemo } from 'react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { CompactSignalCard } from './CompactSignalCard';

export function TimelineView() {
  const signals = useSignalStore(s => s.signals);
  const selectSignal = useSignalStore(s => s.selectSignal);
  const selectedSignalId = useSignalStore(s => s.selectedSignalId);
  const toggleDetailPanel = useUIStore(s => s.toggleDetailPanel);

  const grouped = useMemo(() => {
    const sorted = [...signals].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const groups = new Map<string, { label: string; signals: typeof sorted }>();

    sorted.forEach(signal => {
      const date = new Date(signal.createdAt);
      const dayKey = startOfDay(date).toISOString();

      if (!groups.has(dayKey)) {
        let label: string;
        if (isToday(date)) {
          label = 'Today';
        } else if (isYesterday(date)) {
          label = 'Yesterday';
        } else {
          label = format(date, 'MMMM d, yyyy');
        }
        groups.set(dayKey, { label, signals: [] });
      }
      groups.get(dayKey)!.signals.push(signal);
    });

    return Array.from(groups.entries()).map(([key, value]) => ({
      key,
      ...value,
    }));
  }, [signals]);

  const handleSelect = (id: string) => {
    if (selectedSignalId === id) {
      selectSignal(null);
      toggleDetailPanel(false);
    } else {
      selectSignal(id);
      toggleDetailPanel(true);
    }
  };

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <p className="text-text-muted text-sm font-mono">No signals yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity density bar */}
      <ActivityBar signals={signals} />

      {grouped.map(group => (
        <div key={group.key}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-sans font-bold text-text-primary">{group.label}</h3>
            <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 bg-elevated rounded-full">
              {group.signals.length} signal{group.signals.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {group.signals.map(signal => (
              <CompactSignalCard
                key={signal.id}
                signal={signal}
                isSelected={signal.id === selectedSignalId}
                onClick={() => handleSelect(signal.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityBar({ signals }: { signals: typeof useSignalStore extends (s: any) => infer R ? any : never }) {
  const days = useMemo(() => {
    const now = Date.now();
    const counts: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const dayStart = startOfDay(new Date(now - i * 86400000)).getTime();
      const dayEnd = dayStart + 86400000;
      const count = (signals as any[]).filter((s: any) => {
        const t = new Date(s.createdAt).getTime();
        return t >= dayStart && t < dayEnd;
      }).length;
      counts.push(count);
    }
    return counts;
  }, [signals]);

  const max = Math.max(...days, 1);

  return (
    <div className="flex items-end gap-px h-8">
      {days.map((count, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all"
          style={{
            height: `${Math.max((count / max) * 100, 4)}%`,
            backgroundColor: count > 0
              ? `rgba(0, 255, 163, ${0.2 + (count / max) * 0.6})`
              : 'rgba(255,255,255,0.03)',
          }}
          title={`${count} signal${count !== 1 ? 's' : ''}`}
        />
      ))}
    </div>
  );
}
