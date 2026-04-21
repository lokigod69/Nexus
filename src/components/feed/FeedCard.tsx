'use client';

import { getCategoryColor, getCategoryById } from '@/lib/utils/categories';
import { getAgeLabel } from '@/lib/utils/time';
import { SourceIcon } from '@/lib/utils/sourceIcons';
import type { Signal, Tag } from '@/types';

// --- Shared exports for SignalModal ---

export function hasRedundantContent(summary: string | null, extractedContent: string | null): boolean {
  if (!summary || !extractedContent) return false;
  const s = summary.substring(0, 50).toLowerCase().trim();
  const e = extractedContent.substring(0, 50).toLowerCase().trim();
  return s === e;
}

export function ActionButton({
  icon,
  label,
  onClick,
  color,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <button
      className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-secondary rounded transition-colors hover:bg-[#1a1a2e] disabled:opacity-50 disabled:cursor-not-allowed"
      style={color ? { color } : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );
}

// --- Helpers ---

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

// --- FeedCard ---

interface FeedCardProps {
  signal: Signal;
  onOpenModal: (signalId: string) => void;
}

export function FeedCard({ signal, onOpenModal }: FeedCardProps) {
  const catColor = getCategoryColor(signal.category);
  const catDef = getCategoryById(signal.category);
  const age = getAgeLabel(signal.createdAt);
  const ogData = signal.enrichments?.og_image as { url?: string } | undefined;
  const ogUrl = ogData?.url;
  const { r, g, b } = hexToRgb(catColor);

  return (
    <div
      className="group relative cursor-pointer feed-card pb-2"
      onClick={() => onOpenModal(signal.id)}
    >
      {/* Rotating border glow — visible on hover */}
      <div
        className="absolute inset-[-1px] rounded-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `conic-gradient(from var(--glow-angle, 0deg), transparent 80%, ${catColor}26 90%, transparent 100%)`,
          animation: 'glowRotate 8s linear infinite',
          zIndex: 0,
        }}
      />

      {/* Card inner */}
      <div
        className="relative z-[1] rounded-xl overflow-hidden"
        style={{
          background: `linear-gradient(90deg, rgba(${r},${g},${b},0.06) 0%, transparent 30%), rgba(255,255,255,0.03)`,
          border: '1px solid rgba(255,255,255,0.06)',
          borderLeft: `4px solid ${catColor}`,
          padding: '16px 20px',
          minHeight: '100px',
          maxHeight: '200px',
        }}
      >
        {/* Row 1: Header */}
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: catColor, boxShadow: `0 0 6px ${catColor}40` }}
          />
          <SourceIcon source={signal.source} />
          <span
            className="text-[10px] font-mono uppercase flex-shrink-0"
            style={{ color: catColor, letterSpacing: '1.5px' }}
          >
            {catDef.label}
          </span>
          <h3 className="text-[15px] font-semibold text-[#e0e0e0] truncate flex-1 m-0">
            {signal.title}
          </h3>
        </div>

        {/* Row 2: Body — thumbnail + summary */}
        <div className="flex gap-4 items-start">
          {ogUrl && (
            <img
              src={ogUrl}
              alt=""
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          {signal.summary && (
            <p className="text-[13px] text-[#888] leading-relaxed line-clamp-3 m-0 flex-1">
              {signal.summary}
            </p>
          )}
        </div>

        {/* Row 3: Footer — tags + time */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex-1 overflow-hidden whitespace-nowrap text-ellipsis">
            {signal.tags && signal.tags.length > 0 && (
              <span className="text-[10px] font-mono text-[#444]">
                {signal.tags.map(t => `#${t.name}`).join('  ')}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-[#444] flex-shrink-0 ml-3">
            {age}
          </span>
        </div>
      </div>
    </div>
  );
}
