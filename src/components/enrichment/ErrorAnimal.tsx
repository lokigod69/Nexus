'use client';

import { useState } from 'react';
import { getAnimalUrl } from '@/lib/enrichment/http-animals';

interface ErrorAnimalProps {
  statusCode: number;
  preference?: 'cats' | 'dogs' | 'random';
}

export function ErrorAnimal({ statusCode, preference = 'cats' }: ErrorAnimalProps) {
  const [failed, setFailed] = useState(false);
  const url = getAnimalUrl(statusCode, preference);

  if (failed) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={url}
        alt={`HTTP ${statusCode}`}
        width={120}
        height={120}
        className="rounded-lg object-cover"
        style={{ width: 120, height: 120 }}
        onError={() => setFailed(true)}
      />
      <span className="text-[10px] font-mono text-text-muted">
        HTTP {statusCode}
      </span>
    </div>
  );
}
