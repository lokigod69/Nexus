'use client';

import ReactMarkdown from 'react-markdown';
import { CopyButton } from '@/components/common/CopyButton';
import type { Message } from '@/types';

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
        isUser
          ? 'bg-elevated text-text-primary'
          : 'bg-void border border-border-subtle text-text-secondary'
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-elevated [&_pre]:border [&_pre]:border-border-subtle [&_pre]:rounded [&_pre]:p-2 [&_code]:text-accent-primary [&_code]:text-xs">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && message.content && (
          <div className="mt-1 flex justify-end">
            <CopyButton text={message.content} label="" />
          </div>
        )}
      </div>
    </div>
  );
}
