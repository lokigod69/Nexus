'use client';

import { useEffect, useState } from 'react';

interface MemePopupProps {
  memeUrl: string;
  memeName: string;
  onClose: () => void;
}

export function MemePopup({ memeUrl, memeName, onClose }: MemePopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    requestAnimationFrame(() => setVisible(true));

    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // wait for fade-out
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300"
      style={{ opacity: visible ? 1 : 0 }}
      onClick={() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <img
          src={memeUrl}
          alt={memeName}
          className="max-w-[400px] max-h-[60vh] rounded-lg shadow-2xl object-contain"
        />
        <p className="text-sm font-mono text-text-muted">{memeName}</p>
      </div>
    </div>
  );
}
