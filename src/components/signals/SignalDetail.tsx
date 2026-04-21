'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Star, Archive, Trash2, ExternalLink, Download, QrCode, GitFork, AlertTriangle, RefreshCw } from 'lucide-react';
import { Star as StarIcon } from 'lucide-react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TagPill } from '@/components/common/TagPill';
import { CopyButton } from '@/components/common/CopyButton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { BookCard } from '@/components/enrichment/BookCard';
import { getAgeLabel } from '@/lib/utils/time';
import { getCategoryById, CATEGORIES } from '@/lib/utils/categories';
import { QRCodePanel } from '@/components/enrichment/QRCodePanel';
import { PoetryMatch } from '@/components/enrichment/PoetryMatch';
import toast from 'react-hot-toast';
import type { Signal, GitHubStatsData, BookRefData, PoemMatchData } from '@/types';

export function SignalDetail({ signalId }: { signalId: string }) {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [noteValue, setNoteValue] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);
  const updateSignal = useSignalStore(s => s.updateSignal);
  const deleteSignal = useSignalStore(s => s.deleteSignal);
  const selectSignal = useSignalStore(s => s.selectSignal);
  const fetchSignals = useSignalStore(s => s.fetchSignals);
  const toggleDetailPanel = useUIStore(s => s.toggleDetailPanel);
  const setViewMode = useUIStore(s => s.setViewMode);

  useEffect(() => {
    const fetchSignal = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/signals/${signalId}`);
        if (res.ok) {
          const data = await res.json();
          setSignal(data);
          setNoteValue(data.note || '');
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchSignal();
  }, [signalId]);

  const handleClose = () => {
    selectSignal(null);
    toggleDetailPanel(false);
  };

  const handleStar = async () => {
    if (!signal) return;
    const newStatus = signal.status === 'starred' ? 'active' : 'starred';
    await updateSignal(signal.id, { status: newStatus } as any);
    setSignal({ ...signal, status: newStatus } as Signal);
  };

  const handleArchive = async () => {
    if (!signal) return;
    const newStatus = signal.status === 'archived' ? 'active' : 'archived';
    await updateSignal(signal.id, { status: newStatus } as any);
    setSignal({ ...signal, status: newStatus } as Signal);
  };

  const handleDelete = async () => {
    if (!signal) return;
    await deleteSignal(signal.id);
    handleClose();
  };

  const handleNoteSave = async () => {
    if (!signal) return;
    await updateSignal(signal.id, { note: noteValue } as any);
    setSignal({ ...signal, note: noteValue } as Signal);
    setEditingNote(false);
  };

  const handleReanalyze = async () => {
    if (!signal) return;
    setReanalyzing(true);
    try {
      const res = await fetch(`/api/signals/${signal.id}/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rescrape: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSignal(updated);
        fetchSignals();
        toast.success('Re-analysis complete');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Re-analysis failed');
      }
    } catch {
      toast.error('Re-analysis failed');
    }
    setReanalyzing(false);
  };

  if (loading || !signal) {
    return (
      <div className="w-[400px] bg-surface border-l border-border-subtle shrink-0 flex items-center justify-center">
        <div className="text-text-muted text-sm">Loading...</div>
      </div>
    );
  }

  const cat = getCategoryById(signal.category);
  const githubStats = signal.enrichments?.github_stats as GitHubStatsData | undefined;
  const bookRef = signal.enrichments?.book_ref as BookRefData | undefined;
  const poemMatch = signal.enrichments?.poem_match as PoemMatchData | undefined;
  const showPoem = poemMatch && ['philosophy', 'learning', 'lifestyle'].includes(signal.category);

  return (
    <div className="w-[400px] bg-surface border-l border-border-subtle shrink-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border-subtle">
        <button onClick={handleClose} className="cursor-pointer text-text-secondary hover:text-text-primary transition-colors" title="Close detail panel">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleStar} className={`cursor-pointer transition-colors ${signal.status === 'starred' ? 'text-warning' : 'text-text-muted hover:text-warning'}`} title={signal.status === 'starred' ? 'Unstar this signal' : 'Star this signal'}>
            <Star size={16} fill={signal.status === 'starred' ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className={`cursor-pointer transition-colors text-text-muted hover:text-accent-primary ${reanalyzing ? 'animate-spin' : ''}`}
            title="Re-analyze with AI"
          >
            <RefreshCw size={16} />
          </button>
          <button onClick={handleArchive} className={`cursor-pointer transition-colors ${signal.status === 'archived' ? 'text-text-muted' : 'text-text-muted hover:text-text-secondary'}`} title={signal.status === 'archived' ? 'Unarchive this signal' : 'Archive this signal'}>
            <Archive size={16} />
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="cursor-pointer text-text-muted hover:text-danger transition-colors" title="Delete this signal">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* OG Image header */}
        {(signal.enrichments?.og_image as { url: string } | undefined)?.url && (
          <div className="relative w-full h-40 overflow-hidden">
            <img
              src={(signal.enrichments!.og_image as { url: string }).url}
              alt=""
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Category + Type */}
          <div className="flex items-center gap-2">
            <CategoryIcon category={signal.category} />
            <span className="text-xs font-mono uppercase" style={{ color: cat.color }}>{cat.label}</span>
            {signal.contentType && <span className="text-xs font-mono text-text-muted">· {signal.contentType}</span>}
          </div>

          {/* Title */}
          <h2 className="text-xl font-sans font-bold">
            {(signal.enrichments?.emoji as { emoji: string } | undefined)?.emoji && (
              <span className="mr-1">{(signal.enrichments!.emoji as { emoji: string }).emoji}</span>
            )}
            {signal.title}
          </h2>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
            {signal.source === 'brain_dump' ? (
              <span className="text-base">🧠</span>
            ) : (signal.enrichments?.favicon as { url: string; source: string } | undefined)?.url ? (
              <img
                src={(signal.enrichments!.favicon as { url: string; source: string }).url}
                alt=""
                width={24}
                height={24}
                className="rounded-sm"
                style={{ width: 24, height: 24 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null}
            <span>{signal.source === 'brain_dump' ? 'BRAIN DUMP' : signal.source}</span>
            <span>·</span>
            <span>{getAgeLabel(signal.createdAt)}</span>
            <span className="ml-auto"><StatusBadge status={signal.status} /></span>
          </div>

          {/* GitHub Stats */}
          {githubStats && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1 text-warning">
                <StarIcon size={12} /> {githubStats.stars.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-text-secondary">
                <GitFork size={12} /> {githubStats.forks.toLocaleString()}
              </span>
              {githubStats.language && (
                <span className="px-1.5 py-0.5 bg-elevated border border-border-subtle rounded text-text-secondary">
                  {githubStats.language}
                </span>
              )}
              {githubStats.isOutdated && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-danger/10 border border-danger/30 rounded text-danger">
                  <AlertTriangle size={10} /> Possibly Outdated
                </span>
              )}
            </div>
          )}

          {/* Summary */}
          {signal.summary && (
            <div>
              <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Summary</h4>
              <p className="text-sm text-text-secondary leading-relaxed">{signal.summary}</p>
            </div>
          )}

          {/* Brain dump full text */}
          {signal.source === 'brain_dump' && signal.rawScrapedContent && (
            <div>
              <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Original Thought</h4>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{signal.rawScrapedContent}</p>
            </div>
          )}

          {/* Raw content fallback when no analysis */}
          {signal.source !== 'brain_dump' && !signal.summary && !signal.keyTakeaway && signal.rawScrapedContent && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Raw Content</h4>
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="text-[10px] font-mono text-accent-primary hover:underline disabled:opacity-50"
                >
                  {reanalyzing ? 'Analyzing...' : 'Re-analyze with AI'}
                </button>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed line-clamp-6">
                {signal.rawScrapedContent.substring(0, 500)}{signal.rawScrapedContent.length > 500 ? '...' : ''}
              </p>
            </div>
          )}

          {/* Key Takeaway */}
          {signal.keyTakeaway && (
            <div>
              <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Key Takeaway</h4>
              <p className="text-sm text-accent-primary leading-relaxed">{signal.keyTakeaway}</p>
            </div>
          )}

          {/* Book Reference */}
          {bookRef && (
            <div>
              <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Book Reference</h4>
              <BookCard book={bookRef} />
            </div>
          )}

          {/* Extracted Content */}
          {signal.extractedContent && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                  {signal.extractedContentType === 'code' ? 'Extracted Code' : signal.extractedContentType === 'prompt' ? 'Extracted Prompt' : 'Extracted Content'}
                </h4>
                <CopyButton text={signal.extractedContent} />
              </div>
              <pre className="bg-elevated border border-border-subtle rounded-lg p-3 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre-wrap max-h-64">
                {signal.extractedContent}
              </pre>
            </div>
          )}

          {/* Tags */}
          {signal.tags && signal.tags.length > 0 && (
            <div>
              <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {signal.tags.map(tag => (
                  <TagPill key={typeof tag === 'string' ? tag : tag.name} name={typeof tag === 'string' ? tag : tag.name} />
                ))}
              </div>
            </div>
          )}

          {/* Poetry Match */}
          {showPoem && poemMatch && (
            <div>
              <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Poetry Match</h4>
              <PoetryMatch poem={poemMatch} />
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-mono text-text-muted uppercase tracking-wider">My Notes</h4>
              {!editingNote && (
                <button onClick={() => setEditingNote(true)} className="cursor-pointer text-[10px] font-mono text-text-muted hover:text-accent-primary" title="Edit note">Edit</button>
              )}
            </div>
            {editingNote ? (
              <div>
                <textarea
                  value={noteValue}
                  onChange={e => setNoteValue(e.target.value)}
                  rows={3}
                  className="w-full bg-elevated border border-border-active rounded-lg p-2 text-sm text-text-primary focus:outline-none resize-none"
                  autoFocus
                />
                <div className="flex gap-2 mt-1">
                  <button onClick={handleNoteSave} className="cursor-pointer text-xs text-accent-primary hover:underline">Save</button>
                  <button onClick={() => { setEditingNote(false); setNoteValue(signal.note || ''); }} className="cursor-pointer text-xs text-text-muted hover:underline">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{signal.note || 'No notes yet. Click Edit to add.'}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 relative">
            {signal.url && (
              <a
                href={signal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
              >
                <ExternalLink size={12} /> {(() => { try { return new URL(signal.url).hostname.replace('www.', ''); } catch { return 'Open Original'; } })()}
              </a>
            )}
            <button
              onClick={() => {
                fetch('/api/export/obsidian-sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ signalId: signal.id }),
                })
                  .then(r => r.ok ? r.json() : Promise.reject())
                  .then(() => toast.success('Exported to Obsidian'))
                  .catch(() => toast.error('Export failed'));
              }}
              className="cursor-pointer flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
              title="Export to Obsidian"
            >
              <Download size={12} /> Export to Obsidian
            </button>
            <button
              onClick={() => { setViewMode('feed'); handleClose(); }}
              className="cursor-pointer flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
              title="Open in Feed view"
            >
              Open in Feed
            </button>
            {signal.url && (
              <button
                onClick={() => setShowQRCode(prev => !prev)}
                className="cursor-pointer flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-border-subtle rounded-lg text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
                title="Show QR code"
              >
                <QrCode size={12} /> QR
              </button>
            )}
            {showQRCode && signal.url && (
              <QRCodePanel url={signal.url} onClose={() => setShowQRCode(false)} />
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="border-t border-border-subtle">
          <ChatPanel signalId={signal.id} />
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Signal"
          message="This will permanently delete this signal and all its conversations."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
