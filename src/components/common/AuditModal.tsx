'use client';

import { useUIStore } from '@/stores/uiStore';
import ReactMarkdown from 'react-markdown';
import { X, Loader2 } from 'lucide-react';

export function AuditModal() {
  const open = useUIStore(s => s.auditModalOpen);
  const loading = useUIStore(s => s.auditLoading);
  const result = useUIStore(s => s.auditResult);
  const closeAudit = useUIStore(s => s.closeAudit);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        if (e.target === e.currentTarget) closeAudit();
      }}>
      <div
        className="bg-surface border border-border-subtle rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h3 className="text-lg font-sans font-semibold text-text-primary">Knowledge Audit</h3>
          <button
            onClick={closeAudit}
            className="cursor-pointer text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={24} className="animate-spin text-accent-primary" />
              <p className="text-sm text-text-secondary">Analyzing your knowledge collection...</p>
            </div>
          ) : result ? (
            <div className="prose prose-invert prose-sm max-w-none text-text-secondary
              [&_h2]:text-text-primary [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
              [&_h3]:text-text-primary [&_h3]:text-sm [&_h3]:font-semibold
              [&_strong]:text-text-primary
              [&_li]:text-text-secondary [&_li]:text-sm
              [&_p]:text-sm [&_p]:leading-relaxed
              [&_ul]:space-y-1
              [&_ol]:space-y-1">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="p-4 border-t border-border-subtle flex justify-end">
            <button
              onClick={closeAudit}
              className="cursor-pointer px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border-subtle rounded transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
