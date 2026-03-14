'use client';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  inbox: { label: 'Inbox', color: '#00ffa3' },
  active: { label: 'Active', color: '#7b8aff' },
  starred: { label: 'Starred', color: '#ffd700' },
  playground: { label: 'Do Today', color: '#ff6bff' },
  archived: { label: 'Archived', color: '#444444' },
  triaged: { label: 'Triaged', color: '#888888' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.triaged;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-full border"
      style={{ borderColor: config.color, color: config.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}
