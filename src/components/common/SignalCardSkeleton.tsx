'use client';

export function SignalCardSkeleton() {
  return (
    <div className="bg-surface border border-border-subtle rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-16 h-4 bg-elevated rounded" />
        <div className="w-12 h-4 bg-elevated rounded" />
      </div>
      <div className="w-full h-5 bg-elevated rounded mb-2" />
      <div className="w-3/4 h-5 bg-elevated rounded mb-3" />
      <div className="w-full h-12 bg-elevated rounded mb-3" />
      <div className="flex gap-2">
        <div className="w-14 h-5 bg-elevated rounded-full" />
        <div className="w-18 h-5 bg-elevated rounded-full" />
        <div className="w-12 h-5 bg-elevated rounded-full" />
      </div>
    </div>
  );
}
