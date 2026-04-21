'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Archive, RefreshCw, ExternalLink, Trash2, MessageSquare, X, FileText, Loader2 } from 'lucide-react';
import { getCategoryColor } from '@/lib/utils/categories';
import { getAgeLabel } from '@/lib/utils/time';
import { SourceIcon } from '@/lib/utils/sourceIcons';
import { CopyButton } from '@/components/common/CopyButton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ActionButton, hasRedundantContent } from './FeedCard';
import { useSignalStore } from '@/stores/signalStore';
import { DocReaderModal } from '@/components/docs/DocReaderModal';
import { TagInput } from '@/components/common/TagInput';
import toast from 'react-hot-toast';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

interface SignalModalProps {
  signalId: string;
  onClose: () => void;
  onOpenChat: (signalId: string, signalTitle: string) => void;
}

export function SignalModal({ signalId, onClose, onOpenChat }: SignalModalProps) {
  const signal = useSignalStore(s => s.signals.find(sig => sig.id === signalId));
  const updateSignal = useSignalStore(s => s.updateSignal);
  const deleteSignal = useSignalStore(s => s.deleteSignal);
  const fetchSignals = useSignalStore(s => s.fetchSignals);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [hasDoc, setHasDoc] = useState(false);
  const [showDocReader, setShowDocReader] = useState(false);

  // Check if this signal has a doc
  useEffect(() => {
    if (!signal) return;
    fetch('/api/signals/docs?mode=status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.documentedIds?.includes(signal.id)) {
          setHasDoc(true);
        }
      })
      .catch(() => {});
  }, [signal]);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  if (!signal) return null;

  const catColor = getCategoryColor(signal.category);
  const age = getAgeLabel(signal.createdAt);
  const ogData = signal.enrichments?.og_image as { url?: string } | undefined;
  const ogUrl = ogData?.url;
  const { r, g, b } = hexToRgb(catColor);

  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = signal.status === 'starred' ? 'active' : 'starred';
    await updateSignal(signal.id, { status: newStatus });
    toast.success(newStatus === 'starred' ? 'Starred' : 'Unstarred');
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateSignal(signal.id, { status: 'archived' });
    toast.success('Archived');
  };

  const handleReanalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (reanalyzing) return;
    setReanalyzing(true);
    try {
      const res = await fetch(`/api/signals/${signal.id}/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rescrape: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Re-analyze failed');
      }
      toast.success('Re-analysis complete');
      await fetchSignals();
    } catch (err: any) {
      toast.error(err.message || 'Re-analyze failed');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetch('/api/export/obsidian-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signalId: signal.id }),
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => toast.success('Exported to Obsidian'))
      .catch(() => toast.error('Export failed'));
  };

  const handleDelete = async () => {
    await deleteSignal(signal.id);
    setConfirmDelete(false);
    toast.success('Deleted');
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center signal-modal-overlay"
        style={{
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={(e) => {
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0) return;
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Modal body */}
        <div
          className="w-[90%] max-w-[640px] max-h-[85vh] overflow-y-auto rounded-[20px] relative signal-modal-body"
          style={{
            background: `linear-gradient(135deg, rgba(${r},${g},${b},0.12) 0%, rgba(13,13,20,0.95) 50%)`,
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '32px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-[#1a1a2e] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <X size={18} />
          </button>

          {/* Header: category dot + source icon + full title */}
          <div className="flex items-start gap-2 pr-8">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: catColor, boxShadow: `0 0 8px ${catColor}40` }}
            />
            <SourceIcon source={signal.source} />
            <h2 className="text-lg font-semibold text-text-primary leading-snug">
              {signal.title}
            </h2>
          </div>

          {/* Time + source */}
          <div className="mt-2 ml-[18px] text-xs text-text-muted font-mono">
            {age} &middot; {signal.source.replace('_', ' ')}
          </div>

          <div className="mt-5 space-y-5">
            {/* OG Image */}
            {ogUrl && (
              <div className="relative rounded-xl overflow-hidden">
                <img
                  src={ogUrl}
                  alt=""
                  className="w-full max-h-[300px] object-cover"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                  style={{ background: `linear-gradient(to top, rgba(13,13,20,0.95), transparent)` }}
                />
              </div>
            )}

            {/* Full summary */}
            {signal.summary && !hasRedundantContent(signal.summary, signal.extractedContent) && (
              <p className="text-sm text-text-secondary leading-relaxed">
                {signal.summary}
              </p>
            )}

            {/* Open original link */}
            {signal.url && signal.source !== 'brain_dump' && (
              <a
                href={signal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-text-ghost hover:text-text-secondary transition-colors"
              >
                Open original
                <ExternalLink size={11} />
              </a>
            )}

            {/* Key Takeaway */}
            {signal.keyTakeaway && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: catColor }}>
                  Key Takeaway
                </span>
                <p className="text-sm mt-1" style={{ color: catColor }}>
                  {signal.keyTakeaway}
                </p>
              </div>
            )}

            {/* Extracted Content (skip for brain dumps) */}
            {signal.extractedContent && signal.source !== 'brain_dump' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                    Extracted Content
                  </span>
                  <CopyButton text={signal.extractedContent} />
                </div>
                <div
                  className="p-3 rounded font-mono text-xs text-text-secondary bg-[#08080d] overflow-x-auto whitespace-pre-wrap"
                  style={{ borderLeft: `2px solid ${catColor}` }}
                >
                  {signal.extractedContent}
                </div>
              </div>
            )}

            {/* Original Thought (brain dumps) */}
            {signal.source === 'brain_dump' && signal.rawScrapedContent && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Original Thought
                </span>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  {signal.rawScrapedContent}
                </p>
              </div>
            )}

            {/* User Tag Input */}
            <div className="py-1">
              <TagInput
                signalId={signal.id}
                initialTags={signal.tags?.map(t => ({ id: t.id, name: typeof t === 'string' ? t : t.name })) || []}
                onTagsChange={() => fetchSignals()}
              />
            </div>

            {/* Chat button */}
            <button
              className="cursor-pointer w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#08080d] border border-[#1a1a2e] hover:border-[#2a2a4e] transition-colors text-sm text-text-muted hover:text-text-secondary"
              onClick={() => onOpenChat(signal.id, signal.title)}
            >
              <MessageSquare size={14} />
              Chat with AI about this signal...
            </button>

            {/* Action row */}
            <div className="flex items-center gap-1 pt-1 border-t border-[#1a1a2e]">
              <ActionButton
                icon={<Star size={13} fill={signal.status === 'starred' ? '#ffd700' : 'none'} />}
                label={signal.status === 'starred' ? 'Unstar' : 'Star'}
                onClick={handleStar}
                color={signal.status === 'starred' ? '#ffd700' : undefined}
              />
              <ActionButton
                icon={<Archive size={13} />}
                label="Archive"
                onClick={handleArchive}
              />
              <ActionButton
                icon={<RefreshCw size={13} className={reanalyzing ? 'animate-spin' : ''} />}
                label={reanalyzing ? 'Re-analyzing...' : 'Re-analyze'}
                onClick={handleReanalyze}
                disabled={reanalyzing}
              />
              <ActionButton
                icon={<ExternalLink size={13} />}
                label="Export to Obsidian"
                onClick={handleExport}
              />
              <ActionButton
                icon={<Trash2 size={13} />}
                label="Delete"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                color="#ff4444"
              />
              <ActionButton
                icon={generatingDoc ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                label={generatingDoc ? 'Generating...' : hasDoc ? 'View Doc' : 'Generate Doc'}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (hasDoc) {
                    setShowDocReader(true);
                    return;
                  }
                  setGeneratingDoc(true);
                  try {
                    const res = await fetch('/api/signals/docs', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ signalId: signal.id }),
                    });
                    if (!res.ok) throw new Error('Generation failed');
                    const reader = res.body?.getReader();
                    if (reader) {
                      const decoder = new TextDecoder();
                      while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        for (const line of chunk.split('\n')) {
                          if (!line.startsWith('data: ')) continue;
                          try {
                            const parsed = JSON.parse(line.slice(6));
                            if (parsed.done) {
                              toast.success('Documentation generated!');
                              setHasDoc(true);
                            } else if (parsed.error) {
                              toast.error(parsed.error);
                            }
                          } catch { /* skip */ }
                        }
                      }
                    }
                  } catch {
                    toast.error('Failed to generate doc');
                  } finally {
                    setGeneratingDoc(false);
                  }
                }}
                disabled={generatingDoc}
                color={hasDoc ? '#7b8aff' : undefined}
              />
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Signal"
          message={`Delete "${signal.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {showDocReader && (
        <DocReaderModal
          signalId={signal.id}
          onClose={() => setShowDocReader(false)}
          onRegenerate={(id) => {
            setShowDocReader(false);
            setHasDoc(false);
            // Trigger regeneration
            setGeneratingDoc(true);
            fetch('/api/signals/docs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ signalId: id }),
            }).then(() => {
              setHasDoc(true);
              toast.success('Documentation regenerated!');
            }).catch(() => toast.error('Regeneration failed'))
              .finally(() => setGeneratingDoc(false));
          }}
          onDelete={async (id) => {
            setShowDocReader(false);
            await fetch(`/api/signals/docs/${id}`, { method: 'DELETE' });
            setHasDoc(false);
            toast.success('Document deleted');
          }}
        />
      )}
    </>
  );
}
