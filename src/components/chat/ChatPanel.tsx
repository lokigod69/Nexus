'use client';

import { useEffect, useState, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ProviderSwitch } from './ProviderSwitch';
import toast from 'react-hot-toast';
import { fetchDefinition } from '@/lib/enrichment/dictionary';
import type { Message, AIProviderType, DictionaryResult } from '@/types';

export function ChatPanel({ signalId }: { signalId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [provider, setProvider] = useState<AIProviderType>('anthropic');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load conversation
  useEffect(() => {
    const loadChat = async () => {
      try {
        const res = await fetch(`/api/signals/${signalId}/chat`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) { console.error(err); }
    };
    loadChat();
  }, [signalId]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const handleSend = async (text: string) => {
    // Intercept /define command
    if (text.startsWith('/define ')) {
      const word = text.slice(8).trim();
      if (!word) return;

      const userMsg: Message = {
        id: `temp-${Date.now()}`,
        conversationId: '',
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMsg]);

      const result = await fetchDefinition(word);
      let content: string;
      if (!result) {
        content = `No definition found for "${word}".`;
      } else {
        const parts: string[] = [];
        parts.push(`**${result.word}**${result.phonetic ? ` ${result.phonetic}` : ''}`);
        for (const meaning of result.meanings) {
          parts.push(`\n*${meaning.partOfSpeech}*`);
          for (const def of meaning.definitions) {
            parts.push(`- ${def.definition}${def.example ? ` (e.g. "${def.example}")` : ''}`);
          }
        }
        content = parts.join('\n');
      }

      const sysMsg: Message = {
        id: `define-${Date.now()}`,
        conversationId: '',
        role: 'system',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, sysMsg]);
      return;
    }

    // Optimistically add user message
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      conversationId: '',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamText('');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/signals/${signalId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, provider }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Chat failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setStreamText(fullText);
              }
              if (parsed.error) {
                console.error('Stream error:', parsed.error);
                toast.error('AI response error');
              }
            } catch {}
          }
        }
      }

      if (!controller.signal.aborted) {
        // Add assistant message
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          conversationId: '',
          role: 'assistant',
          content: fullText,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamText('');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Chat error:', err);
        toast.error('Chat failed');
      }
      setStreamText('');
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-mono text-text-secondary">
          <MessageSquare size={14} />
          AI Chat
        </div>
        <ProviderSwitch value={provider} onChange={setProvider} />
      </div>

      {/* Messages */}
      <div className="px-4 space-y-3 overflow-y-auto flex-1 min-h-0">
        {messages.length === 0 && !streaming && (
          <p className="text-xs text-text-muted py-4 text-center">Ask anything about this signal...</p>
        )}
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {streaming && streamText && (
          <ChatMessage message={{ id: 'streaming', conversationId: '', role: 'assistant', content: streamText, createdAt: '' }} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4">
        <ChatInput onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  );
}
