'use client';

import { X, Copy, ExternalLink, RefreshCw, Trash2, Check } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useEnrichmentStore } from '@/stores/enrichmentStore';
import { TagInput } from '@/components/common/TagInput';

interface DocReaderModalProps {
  signalId: string;
  onClose: () => void;
  onRegenerate: (signalId: string) => void;
  onDelete: (signalId: string) => void;
  onOpenSignal?: (signalId: string) => void;
}

interface DocData {
  title: string;
  content: string;
  category: string;
  source: string;
  wordCount: number;
  createdAt: string;
}

export function DocReaderModal({
  signalId,
  onClose,
  onRegenerate,
  onDelete,
  onOpenSignal,
}: DocReaderModalProps) {
  const [doc, setDoc] = useState<DocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'kid' | 'metaphor'>('main');
  const [signalTags, setSignalTags] = useState<{ id: number; name: string }[]>([]);

  const documentFont = useEnrichmentStore(s => s.settings['ui.document_font'] || 'inter');
  const documentSize = useEnrichmentStore(s => s.settings['ui.document_size'] || 'prose-sm');
  
  const getFontFamily = (font: string) => {
    switch (font) {
      case 'nunito': return "'Nunito', sans-serif";
      case 'quicksand': return "'Quicksand', sans-serif";
      case 'lora': return "'Lora', serif";
      case 'merriweather': return "'Merriweather', serif";
      case 'outfit': return "'Outfit', sans-serif";
      default: return "'Inter', sans-serif";
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [docRes, signalRes] = await Promise.all([
          fetch(`/api/signals/docs/${signalId}`),
          fetch(`/api/signals/${signalId}`),
        ]);
        if (docRes.ok) {
          const data = await docRes.json();
          setDoc(data.doc);
        }
        if (signalRes.ok) {
          const signalData = await signalRes.json();
          if (signalData.tags) {
            setSignalTags(signalData.tags.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name })));
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [signalId]);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  const handleCopy = () => {
    if (!doc) return;
    navigator.clipboard.writeText(doc.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let mainContent = doc?.content || '';
  let kidContent = '';
  let metaphorContent = '';

  if (doc?.content) {
    const kidRegex = /## Explain it to me like I'm 10\n([\s\S]*?)(?=## Metaphorical Explanation|---|$)/i;
    const metaphorRegex = /## Metaphorical Explanation\n([\s\S]*?)(?=---|$)/i;
    
    const kidMatch = doc.content.match(kidRegex);
    if (kidMatch) kidContent = kidMatch[1].trim();

    const metaphorMatch = doc.content.match(metaphorRegex);
    if (metaphorMatch) metaphorContent = metaphorMatch[1].trim();

    mainContent = doc.content
      .replace(kidRegex, '')
      .replace(metaphorRegex, '')
      .trim();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-[92%] max-w-[780px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 transform scale-100"
        style={{
          background: 'radial-gradient(120% 120% at 50% 0%, rgba(30,30,45,0.95) 0%, rgba(10,10,15,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderTop: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 40px 100px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex-1 min-w-0">
            {doc ? (
              <>
                <h2 className="text-lg font-semibold text-white truncate">{doc.title}</h2>
                <div className="flex items-center gap-3 mt-1 text-xs font-mono text-text-ghost">
                  <span>{doc.wordCount} words</span>
                  <span>·</span>
                  <span>{doc.category}</span>
                  <span>·</span>
                  <span>{doc.source}</span>
                  <span>·</span>
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-2">
                  <TagInput
                    signalId={signalId}
                    initialTags={signalTags}
                    onTagsChange={(tags) => setSignalTags(tags)}
                    compact
                  />
                </div>
              </>
            ) : (
              <div className="h-8 w-60 bg-white/5 rounded animate-pulse" />
            )}
          </div>

          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-white/8 text-text-muted hover:text-white transition-colors cursor-pointer"
              title="Copy markdown"
            >
              {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
            </button>
            {onOpenSignal && (
              <button
                onClick={() => onOpenSignal(signalId)}
                className="p-2 rounded-lg hover:bg-white/8 text-text-muted hover:text-white transition-colors cursor-pointer"
                title="Open original signal"
              >
                <ExternalLink size={15} />
              </button>
            )}
            <button
              onClick={() => onRegenerate(signalId)}
              className="p-2 rounded-lg hover:bg-white/8 text-text-muted hover:text-white transition-colors cursor-pointer"
              title="Regenerate document"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => { onDelete(signalId); onClose(); }}
              className="p-2 rounded-lg hover:bg-white/8 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
              title="Delete document"
            >
              <Trash2 size={15} />
            </button>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/8 text-text-muted hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Custom Tab Bar if extra sections exist */}
        {doc && (kidContent || metaphorContent) && (
          <div className="flex px-6 border-b border-white/5 bg-white/2">
            <button
              onClick={() => setActiveTab('main')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === 'main' ? 'border-accent text-white' : 'border-transparent text-text-muted hover:text-white'
              }`}
            >
              Document
            </button>
            {kidContent && (
              <button
                onClick={() => setActiveTab('kid')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'kid' ? 'border-accent text-white' : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                Simple Terms (ELI10)
              </button>
            )}
            {metaphorContent && (
              <button
                onClick={() => setActiveTab('metaphor')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'metaphor' ? 'border-accent text-white' : 'border-transparent text-text-muted hover:text-white'
                }`}
              >
                Poetic Metaphor
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : doc ? (
            <div
              className="px-8 py-6 sm:px-12 md:px-16"
              style={{ maxWidth: '700px', margin: '0 auto' }}
            >
              <div 
                className={`doc-reader prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold ${documentSize}`}
                style={{ 
                  fontFamily: getFontFamily(documentFont),
                  color: 'rgba(255, 255, 255, 0.88)'
                }}
              >
                {activeTab === 'main' && <ReactMarkdown>{mainContent}</ReactMarkdown>}
                {activeTab === 'kid' && <ReactMarkdown>{kidContent}</ReactMarkdown>}
                {activeTab === 'metaphor' && <ReactMarkdown>{metaphorContent}</ReactMarkdown>}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-text-muted text-sm">
              Document not found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
