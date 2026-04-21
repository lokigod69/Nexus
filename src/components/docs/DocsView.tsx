'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileText, Play, Loader2, Search, X, Filter } from 'lucide-react';
import { useSignalStore } from '@/stores/signalStore';
import { DocCard } from './DocCard';
import { DocReaderModal } from './DocReaderModal';
import toast from 'react-hot-toast';
import type { Signal } from '@/types';

interface DocMeta {
  signalId: string;
  filename: string;
  title: string;
  category: string;
  source: string;
  wordCount: number;
  preview: string;
  createdAt: string;
}

interface BatchProgress {
  current: number;
  total: number;
  signalId: string;
  title: string;
  stage: string;
}

export function DocsView() {
  const signals = useSignalStore(s => s.signals);
  const fetchSignals = useSignalStore(s => s.fetchSignals);

  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [documentedIds, setDocumentedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'documented' | 'pending'>('all');
  const [readerSignalId, setReaderSignalId] = useState<string | null>(null);

  // Batch state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());

  // Load docs + signals
  useEffect(() => {
    loadDocs();
    if (signals.length === 0) fetchSignals();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDocs = async () => {
    setLoading(true);
    try {
      const [docsRes, statusRes] = await Promise.all([
        fetch('/api/signals/docs'),
        fetch('/api/signals/docs?mode=status'),
      ]);

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocs(data.docs || []);
      }
      if (statusRes.ok) {
        const data = await statusRes.json();
        setDocumentedIds(new Set(data.documentedIds || []));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Build merged list: signal + doc status
  const mergedItems = useMemo(() => {
    const docMap = new Map(docs.map(d => [d.signalId, d]));

    return signals.map((signal: Signal) => {
      const doc = docMap.get(signal.id);
      return {
        signalId: signal.id,
        title: signal.title,
        category: signal.category,
        source: signal.source as string,
        tags: signal.tags?.map(t => typeof t === 'string' ? t : t.name) || [],
        hasDoc: documentedIds.has(signal.id),
        doc,
      };
    });
  }, [signals, docs, documentedIds]);

  // Filtered + searched
  const filteredItems = useMemo(() => {
    let items = mergedItems;

    if (filterCategory !== 'all') {
      items = items.filter(i => i.category === filterCategory);
    }
    if (filterStatus === 'documented') {
      items = items.filter(i => i.hasDoc);
    } else if (filterStatus === 'pending') {
      items = items.filter(i => !i.hasDoc);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q)) ||
        i.doc?.preview?.toLowerCase().includes(q)
      );
    }

    // Sort: Documented first, pending last. Secondary sort: newest doc first
    return items.sort((a, b) => {
      if (a.hasDoc !== b.hasDoc) {
        return a.hasDoc ? -1 : 1;
      }
      if (a.hasDoc && b.hasDoc && a.doc && b.doc) {
        return new Date(b.doc.createdAt).getTime() - new Date(a.doc.createdAt).getTime();
      }
      return 0;
    });
  }, [mergedItems, filterCategory, filterStatus, search]);

  // Stats
  const docCount = documentedIds.size;
  const totalSignals = signals.length;
  const pendingCount = totalSignals - docCount;

  // Categories for filter
  const categories = useMemo(() => {
    const cats = new Set(signals.map((s: Signal) => s.category));
    return Array.from(cats).sort();
  }, [signals]);

  // Single doc generation
  const generateDoc = useCallback(async (signalId: string) => {
    setGeneratingIds(prev => new Set(prev).add(signalId));

    try {
      const res = await fetch('/api/signals/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generation failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.done && parsed.doc) {
              toast.success(`Doc generated: ${parsed.doc.title}`);
              setDocumentedIds(prev => new Set(prev).add(signalId));
              loadDocs();
            } else if (parsed.error) {
              toast.error(parsed.error);
            }
          } catch {
            // skip
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        try {
          const parsed = JSON.parse(buffer.trim().slice(6));
          if (parsed.done && parsed.doc) {
            toast.success(`Doc generated: ${parsed.doc.title}`);
            setDocumentedIds(prev => new Set(prev).add(signalId));
            loadDocs();
          } else if (parsed.error) {
            toast.error(parsed.error);
          }
        } catch { /* skip */ }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg);
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(signalId);
        return next;
      });
    }
  }, []);

  // Batch generation
  const startBatch = useCallback(async () => {
    if (batchRunning) return;
    setBatchRunning(true);

    try {
      const res = await fetch('/api/signals/docs/batch', { method: 'POST' });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Batch failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = ''; // Line buffer for SSE — chunks can split across reads

      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return;
        try {
          const parsed = JSON.parse(line.slice(6));

          if (parsed.type === 'progress') {
            setBatchProgress({
              current: parsed.current,
              total: parsed.total,
              signalId: parsed.signalId,
              title: parsed.title,
              stage: parsed.stage,
            });
            setGeneratingIds(prev => new Set(prev).add(parsed.signalId));
          } else if (parsed.type === 'completed') {
            // Remove from generating
            setGeneratingIds(prev => {
              const next = new Set(prev);
              next.delete(parsed.signalId);
              return next;
            });
            // Add to documented IDs — updates the card badge immediately
            setDocumentedIds(prev => new Set(prev).add(parsed.signalId));
            // Also add a stub doc entry so cards show word count + preview
            setDocs(prev => [
              ...prev,
              {
                signalId: parsed.signalId,
                filename: '',
                title: parsed.title,
                category: '',
                source: '',
                wordCount: parsed.wordCount || 0,
                preview: '',
                createdAt: new Date().toISOString(),
              },
            ]);
          } else if (parsed.type === 'error') {
            toast.error(`Failed: ${parsed.title?.substring(0, 30)}... — ${parsed.error || 'Unknown error'}`);
            setGeneratingIds(prev => {
              const next = new Set(prev);
              next.delete(parsed.signalId);
              return next;
            });
          } else if (parsed.type === 'done') {
            toast.success(`Batch complete! ${parsed.total} signals documented.`);
            // Full refresh to get real previews + word counts
            loadDocs();
          }
        } catch {
          // Unparseable line — skip silently
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by \n\n — process complete lines
        const parts = buffer.split('\n');
        // Keep the last part as it may be incomplete
        buffer = parts.pop() || '';
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed) processLine(trimmed);
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        processLine(buffer.trim());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Batch failed';
      toast.error(msg);
    } finally {
      setBatchRunning(false);
      setBatchProgress(null);
      setGeneratingIds(new Set());
    }
  }, [batchRunning]);

  const handleDelete = useCallback(async (signalId: string) => {
    try {
      await fetch(`/api/signals/docs/${signalId}`, { method: 'DELETE' });
      toast.success('Document deleted');
      loadDocs();
    } catch {
      toast.error('Delete failed');
    }
  }, []);

  return (
    <>
      <div className="feed-container">
        {/* Header */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText size={20} className="text-accent" />
                Signal Documentation
              </h1>
              <p className="text-xs text-text-muted mt-1 font-mono">
                {docCount} of {totalSignals} signals documented · {pendingCount} pending
              </p>
            </div>

            <button
              onClick={startBatch}
              disabled={batchRunning || pendingCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: batchRunning
                  ? 'rgba(123, 138, 255, 0.1)'
                  : 'linear-gradient(135deg, rgba(123, 138, 255, 0.2), rgba(123, 138, 255, 0.1))',
                border: '1px solid rgba(123, 138, 255, 0.3)',
                color: 'rgb(123, 138, 255)',
              }}
            >
              {batchRunning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              {batchRunning
                ? `Generating ${batchProgress?.current || 0}/${batchProgress?.total || pendingCount}...`
                : `Generate All (${pendingCount})`
              }
            </button>
          </div>

          {/* Batch progress bar */}
          {batchRunning && batchProgress && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                <span className="font-mono truncate max-w-[60%]">
                  {batchProgress.stage === 'scraping' ? '🔍 Scraping' :
                   batchProgress.stage === 'generating' ? '🧠 Generating' :
                   batchProgress.stage === 'saving' ? '💾 Saving' :
                   '⏳ Loading'}: {batchProgress.title}
                </span>
                <span className="font-mono">
                  {batchProgress.current}/{batchProgress.total}
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                    background: 'linear-gradient(90deg, rgb(123, 138, 255), rgb(168, 130, 255))',
                  }}
                />
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[320px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-ghost" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search docs..."
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white/5 border border-white/8 rounded-lg text-text-primary placeholder-text-ghost focus:outline-none focus:border-accent/30 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-ghost hover:text-text-muted cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-text-ghost" />
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="text-xs bg-white/5 border border-white/8 rounded-lg px-2 py-1.5 text-text-secondary focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/8">
              {(['all', 'documented', 'pending'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    filterStatus === status
                      ? 'bg-white/10 text-text-primary'
                      : 'text-text-ghost hover:text-text-muted'
                  }`}
                >
                  {status === 'all' ? 'All' : status === 'documented' ? '✅ Done' : '⏳ Pending'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-text-muted" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <FileText size={32} className="mx-auto mb-3 text-text-ghost" />
              <p className="text-sm text-text-muted">
                {search || filterCategory !== 'all' || filterStatus !== 'all'
                  ? 'No matching documents found.'
                  : 'No signals yet. Capture some signals first!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map(item => (
                <DocCard
                  key={item.signalId}
                  signalId={item.signalId}
                  title={item.title}
                  category={item.category}
                  source={item.source}
                  preview={item.doc?.preview || ''}
                  wordCount={item.doc?.wordCount || 0}
                  createdAt={item.doc?.createdAt || ''}
                  hasDoc={item.hasDoc}
                  generating={generatingIds.has(item.signalId)}
                  tags={item.tags}
                  onClick={() => {
                    if (item.hasDoc) {
                      setReaderSignalId(item.signalId);
                    } else {
                      generateDoc(item.signalId);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reader modal */}
      {readerSignalId && (
        <DocReaderModal
          signalId={readerSignalId}
          onClose={() => setReaderSignalId(null)}
          onRegenerate={(id) => {
            setReaderSignalId(null);
            generateDoc(id);
          }}
          onDelete={(id) => {
            setReaderSignalId(null);
            handleDelete(id);
          }}
          onOpenSignal={(id) => {
            setReaderSignalId(null);
            window.dispatchEvent(new CustomEvent('conductor:open-signal', { detail: { signalId: id } }));
          }}
        />
      )}
    </>
  );
}
