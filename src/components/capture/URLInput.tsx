'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { useEnrichmentStore } from '@/stores/enrichmentStore';
import { QuoteDisplay } from '@/components/enrichment/QuoteDisplay';
import { CATEGORIES } from '@/lib/utils/categories';
import { isValidUrl } from '@/lib/utils/url';

const BRAIN_DUMP_TYPES = [
  { id: '', label: 'Auto-detect' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'quote', label: 'Quote' },
  { id: 'principle', label: 'Principle' },
  { id: 'question', label: 'Question' },
  { id: 'note', label: 'Note' },
];

export function URLInput() {
  const defaultTab = useUIStore(s => s.captureModalDefaultTab);
  const [tab, setTab] = useState<'single' | 'bulk' | 'brain_dump'>(defaultTab);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  // Brain dump state
  const [bdTitle, setBdTitle] = useState('');
  const [bdContent, setBdContent] = useState('');
  const [bdType, setBdType] = useState('');
  const [bdCategory, setBdCategory] = useState('');
  const captureSignal = useSignalStore(s => s.captureSignal);
  const captureBrainDump = useSignalStore(s => s.captureBrainDump);
  const bulkCapture = useSignalStore(s => s.bulkCapture);
  const captureProgress = useSignalStore(s => s.captureProgress);
  const capturing = useSignalStore(s => s.capturing);
  const error = useSignalStore(s => s.error);
  const toggleCaptureModal = useUIStore(s => s.toggleCaptureModal);
  const quotes = useEnrichmentStore(s => s.quotes);

  const handleCapture = async () => {
    if (!url || !isValidUrl(url)) return;
    await captureSignal(url, note || undefined, category || undefined);
    if (!error) {
      setUrl('');
      setNote('');
      setCategory('');
    }
  };

  const handleBulkCapture = async () => {
    const urls = bulkUrls.split('\n').map(u => u.trim()).filter(u => u && isValidUrl(u));
    if (urls.length === 0) return;
    await bulkCapture(urls, true);
  };

  const handleBrainDumpCapture = async () => {
    if (!bdContent.trim()) return;
    await captureBrainDump(
      bdContent.trim(),
      bdTitle.trim() || undefined,
      bdType || undefined,
      bdCategory || undefined
    );
    if (!error) {
      setBdTitle('');
      setBdContent('');
      setBdType('');
      setBdCategory('');
    }
  };

  const urlCount = bulkUrls.split('\n').filter(u => u.trim() && isValidUrl(u.trim())).length;

  const progressLabel: Record<string, string> = {
    idle: '',
    scraping: 'Scraping content...',
    analyzing: 'Analyzing with AI...',
    embedding: 'Computing embedding...',
    captured: tab === 'brain_dump' ? 'Thought captured!' : 'Signal captured!',
    error: error || 'Something went wrong',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => e.stopPropagation()}>
      <div className="bg-surface border border-border-subtle rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-sans font-semibold">Capture New Signal</h2>
          <button onClick={() => toggleCaptureModal(false)} className="cursor-pointer text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('single')} className={`px-3 py-1 text-sm font-mono rounded ${tab === 'single' ? 'bg-elevated text-accent-primary' : 'text-text-secondary'}`}>
            🔗 URL
          </button>
          <button onClick={() => setTab('bulk')} className={`px-3 py-1 text-sm font-mono rounded ${tab === 'bulk' ? 'bg-elevated text-accent-primary' : 'text-text-secondary'}`}>
            📦 Bulk
          </button>
          <button onClick={() => setTab('brain_dump')} className={`px-3 py-1 text-sm font-mono rounded ${tab === 'brain_dump' ? 'bg-elevated text-[#a855f7]' : 'text-text-secondary'}`}>
            🧠 Brain Dump
          </button>
        </div>

        {tab === 'single' && (
          <div className="space-y-3">
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              autoFocus
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
            >
              <option value="">Auto-detect</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
            <textarea
              placeholder="Note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
            />
            <button
              onClick={handleCapture}
              disabled={capturing || !url}
              className="w-full flex items-center justify-center gap-2 py-2 bg-accent-primary text-void font-sans font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {capturing && <Loader2 size={16} className="animate-spin" />}
              {capturing ? progressLabel[captureProgress] : '\u25C8 Capture Signal'}
            </button>
          </div>
        )}

        {tab === 'bulk' && (
          <div className="space-y-3">
            <textarea
              placeholder="Paste URLs, one per line..."
              value={bulkUrls}
              onChange={e => setBulkUrls(e.target.value)}
              className="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none resize-none overflow-y-auto"
              style={{ minHeight: '120px', maxHeight: '300px', height: `${Math.max(120, Math.min(300, (bulkUrls.split('\n').length + 1) * 24))}px` }}
            />
            <div className="text-xs font-mono text-text-secondary">{urlCount} valid URLs detected</div>
            <button
              onClick={handleBulkCapture}
              disabled={capturing || urlCount === 0}
              className="w-full py-2 bg-accent-primary text-void font-sans font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {capturing ? 'Importing...' : `Import ${urlCount} URLs`}
            </button>
          </div>
        )}

        {tab === 'brain_dump' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Name this thought... (optional)"
              value={bdTitle}
              onChange={e => setBdTitle(e.target.value)}
              className="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active"
              autoFocus
            />
            <div>
              <textarea
                placeholder="A thought, a book quote, a morning reflection, a principle you want to remember..."
                value={bdContent}
                onChange={e => setBdContent(e.target.value)}
                rows={5}
                className="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-y"
                style={{ minHeight: '120px' }}
              />
              <div className="text-right text-[10px] font-mono text-text-ghost mt-0.5">
                {bdContent.length} chars
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={bdType}
                onChange={e => setBdType(e.target.value)}
                className="flex-1 bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
              >
                {BRAIN_DUMP_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select
                value={bdCategory}
                onChange={e => setBdCategory(e.target.value)}
                className="flex-1 bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none"
              >
                <option value="">Auto-detect</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <button
              onClick={handleBrainDumpCapture}
              disabled={capturing || !bdContent.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 font-sans font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{ background: 'linear-gradient(135deg, #7b8aff, #a855f7)' }}
            >
              {capturing && <Loader2 size={16} className="animate-spin" />}
              {capturing ? progressLabel[captureProgress] : '🧠 Capture Thought'}
            </button>
          </div>
        )}

        {/* Progress/Error */}
        {captureProgress !== 'idle' && (
          <div className={`mt-3 text-xs font-mono ${captureProgress === 'error' ? 'text-danger' : captureProgress === 'captured' ? 'text-success' : 'text-text-secondary'}`}>
            {progressLabel[captureProgress]}
          </div>
        )}

        {/* Quotes during capture progress */}
        {(captureProgress === 'scraping' || captureProgress === 'analyzing' || captureProgress === 'embedding') && quotes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <QuoteDisplay quotes={quotes} />
          </div>
        )}
      </div>
    </div>
  );
}
