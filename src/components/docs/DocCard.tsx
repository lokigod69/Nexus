'use client';

import { FileText, Check, Loader2 } from 'lucide-react';
import { getCategoryColor, getCategoryById } from '@/lib/utils/categories';
import { SourceIcon } from '@/lib/utils/sourceIcons';

interface DocCardProps {
  signalId: string;
  title: string;
  category: string;
  source: string;
  preview: string;
  wordCount: number;
  createdAt: string;
  hasDoc: boolean;
  generating?: boolean;
  tags?: string[];
  onClick: () => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

export function DocCard({
  title,
  category,
  source,
  preview,
  wordCount,
  createdAt,
  hasDoc,
  generating,
  tags,
  onClick,
}: DocCardProps) {
  const catColor = getCategoryColor(category);
  const catDef = getCategoryById(category);
  const { r, g, b } = hexToRgb(catColor);

  return (
    <div
      className="group relative cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.01]"
      style={{
        background: hasDoc
          ? `linear-gradient(135deg, rgba(${r},${g},${b},0.08) 0%, rgba(13,13,20,0.6) 100%)`
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hasDoc ? `rgba(${r},${g},${b},0.2)` : 'rgba(255,255,255,0.05)'}`,
      }}
      onClick={onClick}
    >
      {/* Top accent */}
      <div
        className="h-[3px] w-full"
        style={{
          background: hasDoc
            ? `linear-gradient(90deg, ${catColor}, ${catColor}40)`
            : 'rgba(255,255,255,0.04)',
        }}
      />

      <div className="p-4 space-y-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <SourceIcon source={source} />
            <span
              className="text-[9px] font-mono uppercase tracking-widest"
              style={{ color: catColor }}
            >
              {catDef.label}
            </span>
          </div>

          {/* Status indicator */}
          {generating ? (
            <Loader2 size={14} className="animate-spin text-accent shrink-0" />
          ) : hasDoc ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10">
              <Check size={10} className="text-emerald-400" />
              <span className="text-[9px] font-mono text-emerald-400">{wordCount}w</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5">
              <FileText size={10} className="text-text-ghost" />
              <span className="text-[9px] font-mono text-text-ghost">no doc</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[13px] font-medium text-text-primary leading-snug line-clamp-2">
          {title}
        </h3>

        {/* Preview */}
        {hasDoc && preview && (
          <p className="text-[11px] text-text-muted leading-relaxed line-clamp-3">
            {preview}
          </p>
        )}

        {/* Tags + date */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex-1 overflow-hidden">
            {tags && tags.length > 0 && (
              <span className="text-[9px] font-mono text-text-ghost truncate">
                {tags.slice(0, 3).map(t => `#${t}`).join(' ')}
              </span>
            )}
          </div>
          {hasDoc && (
            <span className="text-[9px] font-mono text-text-ghost shrink-0">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
