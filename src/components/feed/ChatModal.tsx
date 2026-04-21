'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ChatPanel } from '@/components/chat/ChatPanel';

interface ChatModalProps {
  signalId: string;
  signalTitle: string;
  onClose: () => void;
}

export function ChatModal({ signalId, signalTitle, onClose }: ChatModalProps) {
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        if (e.target === e.currentTarget) onClose();
      }}>
      <div
        className="flex flex-col max-w-[600px] w-full max-h-[80vh] bg-[#0d0d14] rounded-xl border border-[#1a1a2e] shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a2e]">
          <h3 className="text-sm font-semibold text-text-primary truncate pr-4">{signalTitle}</h3>
          <button
            onClick={onClose}
            className="cursor-pointer p-1 text-text-muted hover:text-text-primary transition-colors rounded hover:bg-[#1a1a2e]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Chat body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatPanel signalId={signalId} />
        </div>
      </div>
    </div>
  );
}
