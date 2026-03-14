'use client';

import { useEnrichmentStore } from '@/stores/enrichmentStore';

export function NasaBackground() {
  const apod = useEnrichmentStore(s => s.apod);
  const isEnabled = useEnrichmentStore(s => s.isEnabled);

  if (!isEnabled('nasa_apod') || !apod || apod.mediaType !== 'image') {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    >
      <img
        src={apod.url}
        alt={apod.title}
        className="w-full h-full object-cover"
        style={{ opacity: 0.06 }}
      />
    </div>
  );
}
