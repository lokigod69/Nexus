'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { getQRCodeUrl } from '@/lib/enrichment/qrcode';

interface QRCodePanelProps {
  url: string;
  onClose: () => void;
}

export function QRCodePanel({ url, onClose }: QRCodePanelProps) {
  const [failed, setFailed] = useState(false);
  const qrUrl = getQRCodeUrl(url, 200);

  if (failed) return null;

  return (
    <div className="absolute right-0 top-full mt-2 z-50 bg-elevated border border-border-subtle rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          QR Code
        </span>
        <button
          onClick={onClose}
          className="cursor-pointer text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <img
        src={qrUrl}
        alt="QR Code"
        width={200}
        height={200}
        className="rounded bg-white"
        onError={() => setFailed(true)}
      />
      <p className="text-[10px] font-mono text-text-muted mt-2 max-w-[200px] truncate">
        {url}
      </p>
    </div>
  );
}
