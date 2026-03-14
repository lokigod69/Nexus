'use client';

export function TagPill({ name }: { name: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-mono rounded-full bg-elevated border border-border-subtle text-text-secondary">
      #{name}
    </span>
  );
}
