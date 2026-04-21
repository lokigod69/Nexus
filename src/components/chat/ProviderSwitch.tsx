'use client';

import type { AIProviderType } from '@/types';

export function ProviderSwitch({
  value,
  onChange,
}: {
  value: AIProviderType;
  onChange: (provider: AIProviderType) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as AIProviderType)}
      className="bg-elevated border border-border-subtle rounded px-2 py-0.5 text-[10px] font-mono text-text-secondary focus:outline-none"
    >
      <option value="openrouter">OpenRouter</option>
      <option value="openai">OpenAI</option>
    </select>
  );
}
