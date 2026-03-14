'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { useEnrichmentStore } from '@/stores/enrichmentStore';
import { QuoteDisplay } from '@/components/enrichment/QuoteDisplay';
import { CATEGORIES } from '@/lib/utils/categories';
import { isValidUrl } from '@/lib/utils/url';

export function URLInput() {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [bulkUrls, setBulkUrls] = useState('');
  const captureSignal = useSignalStore(s => s.captureSignal);
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

  const urlCount = bulkUrls.split('\n').filter(u => u.trim() && isValidUrl(u.trim())).length;

  const progressLabel: Record<string, string> = {
    idle: '',
    scraping: 'Scraping content...',
    analyzing: 'Analyzing with AI...',
    embedding: 'Computing embedding...',
    captured: 'Signal captured!',
    error: error || 'Something went wrong',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => toggleCaptureModal(false)}>
      <div className="bg-surface border border-border-subtle rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-sans font-semibold">Capture New Signal</h2>
          <button onClick={() => toggleCaptureModal(false)} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('single')} className={`px-3 py-1 text-sm font-mono rounded ${tab === 'single' ? 'bg-elevated text-accent-primary' : 'text-text-secondary'}`}>Single URL</button>
          <button onClick={() => setTab('bulk')} className={`px-3 py-1 text-sm font-mono rounded ${tab === 'bulk' ? 'bg-elevated text-accent-primary' : 'text-text-secondary'}`}>Bulk Import</button>
        </div>

        {tab === 'single' ? (
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
        ) : (
          <div className="space-y-3">
            <textarea
              placeholder="Paste URLs (one per line)..."
              value={bulkUrls}
              onChange={e => setBulkUrls(e.target.value)}
              rows={6}
              className="w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
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
