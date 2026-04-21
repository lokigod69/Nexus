'use client';

import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { X, Send, Loader2, Plus, History, Trash2, ChevronDown, Brain, TrendingUp, PenLine, Globe, Star, Compass, Zap, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useUIStore } from '@/stores/uiStore';
import { useSignalStore } from '@/stores/signalStore';
import { SignalPill } from './SignalPill';
import type { Signal } from '@/types';

interface ConductorMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationSummary {
  id: string;
  title: string | null;
  messageCount: number;
  preview: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Inject SignalPill components into text content (used inside ReactMarkdown)
function injectPills(
  text: string,
  signalMap: Record<number, string>,
  signals: Signal[],
  onOpenSignal: (id: string) => void,
  onRequestDetail: (num: number) => void,
): React.ReactNode {
  const parts = text.split(/(\[\d+\])/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) {
      const num = parseInt(match[1]);
      const signalId = signalMap[num];
      if (signalId) {
        const signal = signals.find(s => s.id === signalId);
        if (signal) {
          return (
            <SignalPill
              key={`pill-${i}`}
              num={num}
              title={signal.title}
              category={signal.category}
              onClick={() => onOpenSignal(signalId)}
              onRequestDetail={() => onRequestDetail(num)}
            />
          );
        }
      }
    }
    return <Fragment key={`text-${i}`}>{part}</Fragment>;
  });
}

// Render markdown with SignalPill components replacing [N] references
function renderWithPills(
  text: string,
  signalMap: Record<number, string>,
  signals: Signal[],
  onOpenSignal: (id: string) => void,
  onRequestDetail: (num: number) => void,
) {
  const components = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => {
      const processed = processChildren(children);
      return <p {...props}>{processed}</p>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => {
      const processed = processChildren(children);
      return <li {...props}>{processed}</li>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strong: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => {
      const processed = processChildren(children);
      return <strong {...props}>{processed}</strong>;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    em: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => {
      const processed = processChildren(children);
      return <em {...props}>{processed}</em>;
    },
  };

  function processChildren(children: React.ReactNode): React.ReactNode {
    if (typeof children === 'string') {
      return injectPills(children, signalMap, signals, onOpenSignal, onRequestDetail);
    }
    if (Array.isArray(children)) {
      return children.map((child, i) => {
        if (typeof child === 'string') {
          return <Fragment key={i}>{injectPills(child, signalMap, signals, onOpenSignal, onRequestDetail)}</Fragment>;
        }
        return child;
      });
    }
    return children;
  }

  return (
    <ReactMarkdown components={components}>
      {text}
    </ReactMarkdown>
  );
}

// Strip internal markers from displayed text
function cleanDisplayText(text: string): string {
  return text
    .replace(/\[REMEMBER\]\s*.+/gi, '')
    .replace(/\[MEMORY\]\s*.+/gi, '')
    .replace(/\[NOTE_TO_SELF\]\s*.+/gi, '')
    .replace(/\[ACTION:(STAR|ARCHIVE|UNSTAR|UNARCHIVE)\s+\d+\]/gi, '')
    .replace(/\[DOCUMENT:(research|draft|notes)\]\s*\n/gi, '📄 *Saving document...*\n\n')
    .replace(/\[\/DOCUMENT\]/gi, '\n\n✅ *Document saved to knowledge base.*')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Model info loaded from API
interface ChatModelDef {
  id: string;
  name: string;
  tier: string[];
  free: boolean;
  costInput: number;
}

// Minimum / maximum panel dimensions
const MIN_W = 360;
const MIN_H = 360;
const DEFAULT_W = 520;
const DEFAULT_H_RATIO = 0.92; // percentage of viewport height

type ResizeDirection = 'left' | 'top' | 'top-left' | 'top-right' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right';

export function ConductorPanel() {
  const conductorOpen = useUIStore(s => s.conductorOpen);
  const toggleConductor = useUIStore(s => s.toggleConductor);
  const activeConvId = useUIStore(s => s.activeConductorConversationId);
  const setActiveConv = useUIStore(s => s.setActiveConductorConversation);
  const signals = useSignalStore(s => s.signals);

  const [messages, setMessages] = useState<ConductorMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [signalMap, setSignalMap] = useState<Record<number, string>>({});
  const [expandedSignalIds, setExpandedSignalIds] = useState<string[]>([]);

  // History panel state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Model selector state
  const [conductorModel, setConductorModel] = useState('default');
  const [chatModels, setChatModels] = useState<ChatModelDef[]>([]);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Memory panel state
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<{ id: string; category: string; fact: string; createdAt: string | null }[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  // Documents panel state
  const [docsOpen, setDocsOpen] = useState(false);
  const [docs, setDocs] = useState<{ filename: string; title: string; type: string; createdAt: string; wordCount: number; preview: string }[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; content: string; type: string } | null>(null);

  // Resize state
  const [panelW, setPanelW] = useState(DEFAULT_W);
  const [panelH, setPanelH] = useState(() =>
    typeof window !== 'undefined' ? Math.round(window.innerHeight * DEFAULT_H_RATIO) : 800,
  );
  const resizeRef = useRef<{
    active: boolean;
    dir: ResizeDirection;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sendMessageRef = useRef<((text: string, expandedIds?: string[]) => Promise<void>) | null>(null);
  const userScrolledUpRef = useRef(false);

  // ── Resize handlers ──────────────────────────────────────────────────
  const onResizeStart = useCallback((dir: ResizeDirection, e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = {
      active: true,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: panelW,
      startH: panelH,
    };
  }, [panelW, panelH]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const r = resizeRef.current;
      if (!r?.active) return;
      const dx = e.clientX - r.startX;
      const dy = e.clientY - r.startY;

      const maxW = window.innerWidth - 32;
      const maxH = window.innerHeight - 32;

      let newW = r.startW;
      let newH = r.startH;

      // horizontal
      if (r.dir.includes('left')) newW = Math.max(MIN_W, Math.min(maxW, r.startW - dx));
      if (r.dir.includes('right')) newW = Math.max(MIN_W, Math.min(maxW, r.startW + dx));
      // vertical
      if (r.dir.includes('top')) newH = Math.max(MIN_H, Math.min(maxH, r.startH - dy));
      if (r.dir.includes('bottom')) newH = Math.max(MIN_H, Math.min(maxH, r.startH + dy));

      setPanelW(newW);
      setPanelH(newH);
    };

    const onMouseUp = () => {
      if (resizeRef.current) resizeRef.current.active = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Smart scroll — only auto-scroll if user is near the bottom
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamText]);

  // Focus input when panel opens
  useEffect(() => {
    if (conductorOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [conductorOpen]);

  // Load settings on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?._models?.available) {
          const chatCapable = (data._models.available as ChatModelDef[]).filter(
            (m: { tier: string[] }) => m.tier.includes('chat')
          );
          setChatModels(chatCapable);
        }
        if (data?.conductor_model) {
          setConductorModel(data.conductor_model);
        }
      })
      .catch(() => {});
  }, []);

  // Load active conversation when panel opens (resume)
  useEffect(() => {
    if (conductorOpen && activeConvId) {
      loadConversation(activeConvId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conductorOpen, activeConvId]);

  // Load conversation list
  const loadConversationList = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/conductor');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/conductor/${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })));
          // Try to restore signalMap from last assistant message metadata
          const lastAssistantMsg = [...data.messages].reverse().find((m: { role: string; metadata?: string }) => m.role === 'assistant' && m.metadata);
          if (lastAssistantMsg?.metadata) {
            try {
              const meta = JSON.parse(lastAssistantMsg.metadata);
              if (meta.signalMap) setSignalMap(meta.signalMap);
            } catch { /* ignore */ }
          }
        }
        setActiveConv(convId);
        setHistoryOpen(false);
      }
    } catch {
      // Ignore
    }
  }, [setActiveConv]);

  // Delete a conversation
  const deleteConversation = useCallback(async (convId: string) => {
    try {
      await fetch(`/api/conductor/${convId}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConv(null);
        setMessages([]);
        setSignalMap({});
        setExpandedSignalIds([]);
      }
    } catch {
      // Ignore
    }
  }, [activeConvId, setActiveConv]);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setActiveConv(null);
    setMessages([]);
    setStreamText('');
    setSignalMap({});
    setExpandedSignalIds([]);
    setHistoryOpen(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [setActiveConv]);

  // Open history panel
  const openHistory = useCallback(() => {
    loadConversationList();
    setHistoryOpen(true);
  }, [loadConversationList]);

  // Change conductor model
  const changeModel = useCallback(async (model: string) => {
    setConductorModel(model);
    setModelDropdownOpen(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'conductor_model', value: model }),
      });
    } catch {
      // Ignore
    }
  }, []);

  // Load memories
  const loadMemories = useCallback(async () => {
    setLoadingMemories(true);
    try {
      const res = await fetch('/api/conductor/memory');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingMemories(false);
    }
  }, []);

  // Delete a specific memory
  const deleteMemory = useCallback(async (memId: string) => {
    try {
      await fetch(`/api/conductor/memory?id=${memId}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.id !== memId));
    } catch {
      // Ignore
    }
  }, []);

  // Load documents
  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch('/api/conductor/docs');
      if (res.ok) {
        const data = await res.json();
        setDocs(data.docs || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  // View a specific document
  const viewDoc = useCallback(async (type: string, filename: string) => {
    try {
      const res = await fetch(`/api/conductor/docs/${encodeURIComponent(filename)}?type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setViewingDoc({ title: data.doc.title, content: data.doc.content, type: data.doc.type });
      }
    } catch {
      // Ignore
    }
  }, []);

  // Delete a document
  const deleteDoc = useCallback(async (type: string, filename: string) => {
    try {
      await fetch('/api/conductor/docs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, filename }),
      });
      setDocs(prev => prev.filter(d => d.filename !== filename));
    } catch {
      // Ignore
    }
  }, []);

  const handleOpenSignal = useCallback((signalId: string) => {
    window.dispatchEvent(new CustomEvent('conductor:open-signal', { detail: { signalId } }));
  }, []);

  const sendMessage = async (text: string, expandedIds?: string[]) => {
    if (!text.trim() || streaming) return;

    const userMsg: ConductorMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setStreaming(true);
    setStreamText('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/conductor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          conversationId: activeConvId,
          expandedSignalIds: expandedIds || expandedSignalIds,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'meta') {
              if (parsed.signalMap) setSignalMap(parsed.signalMap);
              if (parsed.conversationId && !activeConvId) {
                setActiveConv(parsed.conversationId);
              }
            } else if (parsed.error) {
              fullText += `\n\n${parsed.error}`;
              setStreamText(fullText);
            } else if (parsed.text) {
              fullText += parsed.text;
              setStreamText(fullText);
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }

      // Add assistant message
      if (fullText) {
        setMessages(prev => [...prev, { role: 'assistant', content: fullText }]);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev => [
          ...prev,
          { role: 'assistant' as const, content: `Error: ${err.message}` },
        ]);
      }
    } finally {
      setStreaming(false);
      setStreamText('');
      abortRef.current = null;
    }
  };

  // Keep ref current
  sendMessageRef.current = sendMessage;

  const handleRequestDetail = useCallback((num: number) => {
    const signalId = signalMap[num];
    if (!signalId) return;

    setExpandedSignalIds(prev => [...prev, signalId]);

    const detailMessage = `Tell me more about [${num}]`;
    sendMessageRef.current?.(detailMessage, [...expandedSignalIds, signalId]);
  }, [signalMap, expandedSignalIds]);

  const handleSubmit = () => {
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!conductorOpen) return null;

  const currentModelLabel = conductorModel === 'default'
    ? 'Auto'
    : chatModels.find(m => m.id === conductorModel)?.name || conductorModel;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col rounded-xl border border-white/10 overflow-hidden"
      style={{
        width: `${panelW}px`,
        height: `${panelH}px`,
        maxHeight: 'calc(100vh - 32px)',
        minHeight: `${MIN_H}px`,
        background: 'rgba(13, 13, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(120, 140, 255, 0.05)',
      }}
    >
      {/* ── Resize handles ─────────────────── */}
      {/* Left edge */}
      <div
        onMouseDown={e => onResizeStart('left', e)}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group"
      >
        <div className="absolute inset-y-0 left-0 w-[2px] bg-accent/0 group-hover:bg-accent/30 transition-colors" />
      </div>
      {/* Top edge */}
      <div
        onMouseDown={e => onResizeStart('top', e)}
        className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize z-20 group"
      >
        <div className="absolute inset-x-0 top-0 h-[2px] bg-accent/0 group-hover:bg-accent/30 transition-colors" />
      </div>
      {/* Top-left corner */}
      <div
        onMouseDown={e => onResizeStart('top-left', e)}
        className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-30"
      />
      {/* Top-right corner */}
      <div
        onMouseDown={e => onResizeStart('top-right', e)}
        className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-30"
      />
      {/* Bottom-left corner */}
      <div
        onMouseDown={e => onResizeStart('bottom-left', e)}
        className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-30"
      />
      {/* Right edge (for completeness - panel is right-anchored, can still resize) */}
      {/* Not needed since the panel is anchored right, but included for wider windows */}
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <span className="text-sm text-accent">◈</span>
          <span className="text-sm font-medium text-white">Conductor</span>
          <span className="text-[10px] font-mono text-text-ghost">
            {signals.length} signals
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono text-text-muted hover:text-white hover:bg-white/8 transition-all cursor-pointer"
              title="AI Model"
            >
              {currentModelLabel}
              <ChevronDown size={10} />
            </button>
            {modelDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-52 rounded-lg border border-white/10 bg-[rgba(13,13,20,0.98)] backdrop-blur-xl shadow-xl z-10 py-1">
                <button
                  onClick={() => changeModel('default')}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${conductorModel === 'default' ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                >
                  Auto (use global setting)
                </button>
                {chatModels.map(m => (
                  <button
                    key={m.id}
                    onClick={() => changeModel(m.id)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${conductorModel === m.id ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
                  >
                    <span>{m.name}</span>
                    <span className={`text-[10px] ${m.free ? 'text-green-500/70' : 'text-text-ghost'}`}>
                      {m.free ? 'FREE' : `$${m.costInput}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Docs button */}
          <button
            onClick={() => { loadDocs(); setDocsOpen(true); }}
            className="p-1 rounded-md hover:bg-white/8 transition-colors cursor-pointer"
            title="Knowledge base documents"
          >
            <FileText size={14} className="text-text-muted" />
          </button>
          {/* Memory button */}
          <button
            onClick={() => { loadMemories(); setMemoryOpen(true); }}
            className="p-1 rounded-md hover:bg-white/8 transition-colors cursor-pointer"
            title="Conductor memory"
          >
            <Brain size={14} className="text-text-muted" />
          </button>
          {/* History button */}
          <button
            onClick={openHistory}
            className="p-1 rounded-md hover:bg-white/8 transition-colors cursor-pointer"
            title="Conversation history"
          >
            <History size={14} className="text-text-muted" />
          </button>
          {/* New conversation */}
          <button
            onClick={startNewConversation}
            className="p-1 rounded-md hover:bg-white/8 transition-colors cursor-pointer"
            title="New conversation"
          >
            <Plus size={14} className="text-text-muted" />
          </button>
          {/* Close */}
          <button
            onClick={() => toggleConductor(false)}
            className="p-1 rounded-md hover:bg-white/8 transition-colors cursor-pointer"
          >
            <X size={14} className="text-text-muted" />
          </button>
        </div>
      </div>

      {/* History sidebar overlay */}
      {historyOpen && (
        <div className="absolute inset-0 z-10 flex flex-col rounded-xl overflow-hidden" style={{ background: 'rgba(13, 13, 20, 0.98)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <span className="text-sm font-medium text-white">History</span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="p-1 rounded-md hover:bg-white/8 transition-colors cursor-pointer"
            >
              <X size={14} className="text-text-muted" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-text-muted" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-text-muted">
                No past conversations yet.
              </div>
            ) : (
              <div className="py-2">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`group flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer ${
                      conv.id === activeConvId ? 'bg-accent/5 border-l-2 border-accent' : ''
                    }`}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-text-secondary truncate">
                        {conv.title || conv.preview || 'Untitled'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-text-ghost font-mono">
                          {conv.messageCount} msgs
                        </span>
                        <span className="text-[10px] text-text-ghost">
                          {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this conversation?')) {
                          deleteConversation(conv.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <Trash2 size={12} className="text-text-muted" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-white/8">
            <button
              onClick={() => { startNewConversation(); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent/10 text-accent text-xs hover:bg-accent/20 transition-colors cursor-pointer"
            >
              <Plus size={12} />
              New Conversation
            </button>
          </div>
        </div>
      )}

      {/* Memory panel overlay */}
      {memoryOpen && (
        <div className="absolute inset-0 z-10 flex flex-col rounded-xl overflow-hidden" style={{ background: 'rgba(13, 13, 20, 0.98)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-purple-400" />
              <span className="text-sm font-medium text-white">Memory</span>
              <span className="text-[10px] font-mono text-text-ghost">{memories.length} facts</span>
            </div>
            <button
              onClick={() => setMemoryOpen(false)}
              className="p-1 rounded-md hover:bg-white/8 transition-colors cursor-pointer"
            >
              <X size={14} className="text-text-muted" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingMemories ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-text-muted" />
              </div>
            ) : memories.length === 0 ? (
              <div className="text-center py-8 px-6">
                <Brain size={24} className="mx-auto mb-3 text-text-ghost" />
                <p className="text-xs text-text-muted mb-1">No memories yet.</p>
                <p className="text-[10px] text-text-ghost max-w-[240px] mx-auto">
                  The Conductor learns about you as you chat. It remembers your projects, preferences, and goals across conversations.
                </p>
              </div>
            ) : (
              <div className="py-2 space-y-1">
                {memories.map(mem => (
                  <div
                    key={mem.id}
                    className="group flex items-start justify-between px-4 py-2 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                          mem.category === 'project' ? 'bg-blue-500/15 text-blue-400' :
                          mem.category === 'user_preference' ? 'bg-amber-500/15 text-amber-400' :
                          mem.category === 'goal' ? 'bg-green-500/15 text-green-400' :
                          mem.category === 'insight' ? 'bg-purple-500/15 text-purple-400' :
                          'bg-white/10 text-text-ghost'
                        }`}>
                          {mem.category}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary">{mem.fact}</div>
                      <div className="text-[10px] text-text-ghost mt-0.5">
                        {mem.createdAt ? new Date(mem.createdAt).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMemory(mem.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 transition-all cursor-pointer shrink-0 mt-1"
                    >
                      <Trash2 size={11} className="text-text-muted" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents panel overlay */}
      {docsOpen && (
        <div className="absolute inset-0 z-10 flex flex-col rounded-xl overflow-hidden" style={{ background: 'rgba(13, 13, 20, 0.98)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              {viewingDoc ? (
                <>
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="text-[10px] text-text-muted hover:text-white transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                  <span className="text-sm font-medium text-white truncate max-w-[300px]">{viewingDoc.title}</span>
                </>
              ) : (
                <>
                  <FileText size={14} className="text-blue-400" />
                  <span className="text-sm font-medium text-white">Documents</span>
                  <span className="text-[10px] font-mono text-text-ghost">{docs.length} docs</span>
                </>
              )}
            </div>
            <button
              onClick={() => { setDocsOpen(false); setViewingDoc(null); }}
              className="p-1 rounded-md hover:bg-white/8 transition-colors cursor-pointer"
            >
              <X size={14} className="text-text-muted" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {viewingDoc ? (
              // Reading view
              <div className="px-4 py-3">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                    viewingDoc.type === 'research' ? 'bg-violet-500/15 text-violet-400' :
                    viewingDoc.type === 'draft' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-emerald-500/15 text-emerald-400'
                  }`}>
                    {viewingDoc.type}
                  </span>
                </div>
                <div className="conductor-message prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{viewingDoc.content}</ReactMarkdown>
                </div>
              </div>
            ) : loadingDocs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={16} className="animate-spin text-text-muted" />
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-8 px-6">
                <FileText size={24} className="mx-auto mb-3 text-text-ghost" />
                <p className="text-xs text-text-muted mb-1">No documents yet.</p>
                <p className="text-[10px] text-text-ghost max-w-[240px] mx-auto">
                  Ask the Conductor to create research docs, brain dumps, or explainers. They&apos;ll be saved here and in your Obsidian vault.
                </p>
              </div>
            ) : (
              <div className="py-2 space-y-1">
                {docs.map(doc => (
                  <div
                    key={doc.filename}
                    className="group flex items-start justify-between px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => viewDoc(doc.type, doc.filename)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                          doc.type === 'research' ? 'bg-violet-500/15 text-violet-400' :
                          doc.type === 'draft' ? 'bg-blue-500/15 text-blue-400' :
                          'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {doc.type}
                        </span>
                        <span className="text-[10px] text-text-ghost font-mono">
                          {doc.wordCount} words
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary font-medium truncate">{doc.title}</div>
                      <div className="text-[10px] text-text-ghost mt-0.5 line-clamp-2">{doc.preview}</div>
                      <div className="text-[10px] text-text-ghost mt-0.5">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteDoc(doc.type, doc.filename); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 transition-all cursor-pointer shrink-0 mt-1"
                    >
                      <Trash2 size={11} className="text-text-muted" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick capability strip — always visible when in a conversation */}
      {messages.length > 0 && !historyOpen && !memoryOpen && !docsOpen && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/[0.05] overflow-x-auto scrollbar-hide">
          <button
            onClick={() => sendMessage('Analyze my signal saving trends. What topics am I focused on?')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-ghost hover:text-emerald-300 hover:bg-emerald-500/10 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            disabled={streaming}
          >
            <TrendingUp size={10} /> Trends
          </button>
          <button
            onClick={() => { setInput('Draft a brain dump about '); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-ghost hover:text-blue-300 hover:bg-blue-500/10 transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <PenLine size={10} /> Draft
          </button>
          <button
            onClick={() => { setInput('Research this URL: '); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-ghost hover:text-purple-300 hover:bg-purple-500/10 transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Globe size={10} /> Research
          </button>
          <button
            onClick={() => sendMessage('Help me organize my signals. Which should I star? Which should I archive?')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-ghost hover:text-amber-300 hover:bg-amber-500/10 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            disabled={streaming}
          >
            <Star size={10} /> Organize
          </button>
          <button
            onClick={() => sendMessage('What gaps exist in my collection? What topics am I missing?')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-ghost hover:text-cyan-300 hover:bg-cyan-500/10 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            disabled={streaming}
          >
            <Compass size={10} /> Gaps
          </button>
          <button
            onClick={() => sendMessage('Find surprising connections between my signals.')}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-ghost hover:text-rose-300 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0 whitespace-nowrap"
            disabled={streaming}
          >
            <Zap size={10} /> Connect
          </button>
          <button
            onClick={() => { setInput('Create a document about '); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-text-ghost hover:text-violet-300 hover:bg-violet-500/10 transition-all cursor-pointer shrink-0 whitespace-nowrap"
          >
            <FileText size={10} /> Document
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-3 space-y-4"
        style={{ paddingLeft: panelW > 800 ? `${Math.min((panelW - 700) / 2, 80)}px` : '16px', paddingRight: panelW > 800 ? `${Math.min((panelW - 700) / 2, 80)}px` : '16px' }}
        onScroll={() => {
          const el = scrollContainerRef.current;
          if (!el) return;
          const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          userScrolledUpRef.current = distFromBottom > 100;
        }}
      >
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col h-full" style={{ maxWidth: panelW > 800 ? '700px' : 'none', margin: panelW > 800 ? '0 auto' : undefined }}>
            {/* Hero */}
            <div className="flex flex-col items-center text-center gap-2 pt-6 pb-4">
              <span className="text-3xl">◈</span>
              <h3 className="text-sm font-medium text-white">Conductor</h3>
              <p className="text-[11px] text-text-muted max-w-[300px] leading-relaxed">
                Your AI navigator for {signals.length} signals. I can find, research, organize, and synthesize your collected knowledge.
              </p>
            </div>

            {/* Capability grid */}
            <div className="grid grid-cols-2 gap-2 px-2 pb-4">
              <button
                onClick={() => sendMessage('Analyze my signal saving trends from the past weeks. What topics am I focused on? What\'s growing? What have I stopped saving?')}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left cursor-pointer group"
              >
                <TrendingUp size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-white group-hover:text-emerald-300 transition-colors">Trends</div>
                  <div className="text-[10px] text-text-ghost leading-snug mt-0.5">What am I saving lately?</div>
                </div>
              </button>

              <button
                onClick={() => { setInput('Draft a brain dump about '); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left cursor-pointer group"
              >
                <PenLine size={14} className="text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-white group-hover:text-blue-300 transition-colors">Draft</div>
                  <div className="text-[10px] text-text-ghost leading-snug mt-0.5">Synthesize a brain dump</div>
                </div>
              </button>

              <button
                onClick={() => { setInput('Research this URL: '); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left cursor-pointer group"
              >
                <Globe size={14} className="text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-white group-hover:text-purple-300 transition-colors">Research URL</div>
                  <div className="text-[10px] text-text-ghost leading-snug mt-0.5">Scrape & discuss a link</div>
                </div>
              </button>

              <button
                onClick={() => sendMessage('Help me organize my signals. Which ones should I star as most valuable? Which should I archive? Give specific recommendations with signal numbers.')}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left cursor-pointer group"
              >
                <Star size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-white group-hover:text-amber-300 transition-colors">Organize</div>
                  <div className="text-[10px] text-text-ghost leading-snug mt-0.5">Star, archive, prioritize</div>
                </div>
              </button>

              <button
                onClick={() => sendMessage('Analyze my collection for gaps. What important related topics am I missing? What should I be looking into next based on what I already have?')}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left cursor-pointer group"
              >
                <Compass size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-white group-hover:text-cyan-300 transition-colors">Find Gaps</div>
                  <div className="text-[10px] text-text-ghost leading-snug mt-0.5">What am I missing?</div>
                </div>
              </button>

              <button
                onClick={() => sendMessage('Find surprising connections between my signals. What unexpected links exist between different topics in my collection?')}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left cursor-pointer group"
              >
                <Zap size={14} className="text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-white group-hover:text-rose-300 transition-colors">Connect</div>
                  <div className="text-[10px] text-text-ghost leading-snug mt-0.5">Discover hidden links</div>
                </div>
              </button>

              <button
                onClick={() => { setInput('Create a research document about '); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] transition-all text-left cursor-pointer group col-span-2"
              >
                <FileText size={14} className="text-violet-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[11px] font-medium text-white group-hover:text-violet-300 transition-colors">Create Document</div>
                  <div className="text-[10px] text-text-ghost leading-snug mt-0.5">Generate research notes, brain dumps, or explainers saved to your knowledge base</div>
                </div>
              </button>
            </div>

            {/* Quick text queries */}
            <div className="flex flex-wrap gap-1.5 justify-center px-4 pb-2">
              {['What do I have about AI?', 'Summarize my collection', 'What should I read first?'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="text-[10px] font-mono px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-text-ghost hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent/15 text-white'
                  : 'bg-white/5 text-text-secondary'
              }`}
              style={{ maxWidth: panelW > 700 ? '680px' : '85%' }}
            >
              {msg.role === 'assistant' ? (
                <div className="conductor-message prose prose-invert prose-sm max-w-none">
                  {renderWithPills(cleanDisplayText(msg.content), signalMap, signals, handleOpenSignal, handleRequestDetail)}
                </div>
              ) : (
                <span className="whitespace-pre-wrap break-words">{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streaming && streamText && (
          <div className="flex justify-start">
            <div
              className="rounded-lg px-3 py-2 text-[13px] leading-relaxed bg-white/5 text-text-secondary"
              style={{ maxWidth: panelW > 700 ? '680px' : '85%' }}
            >
              <div className="conductor-message prose prose-invert prose-sm max-w-none">
                {renderWithPills(cleanDisplayText(streamText), signalMap, signals, handleOpenSignal, handleRequestDetail)}
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {streaming && !streamText && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/5">
              <Loader2 size={12} className="animate-spin text-accent" />
              <span className="text-xs text-text-muted">Searching your collection...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/8">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your signals..."
            rows={2}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-text-ghost focus:outline-none focus:border-accent/40 transition-colors overflow-y-auto"
            style={{ minHeight: '44px', maxHeight: '160px' }}
            disabled={streaming}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || streaming}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Click-away for model dropdown */}
      {modelDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setModelDropdownOpen(false)}
        />
      )}
    </div>
  );
}
