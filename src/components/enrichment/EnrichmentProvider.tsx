'use client';

import { useEffect } from 'react';
import { useEnrichmentStore } from '@/stores/enrichmentStore';
import { NasaBackground } from './NasaBackground';
import { WeatherEffects } from './WeatherEffects';

export function EnrichmentProvider({ children }: { children: React.ReactNode }) {
  const initialize = useEnrichmentStore(s => s.initialize);
  const palette = useEnrichmentStore(s => s.palette);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const paletteStyles: React.CSSProperties = palette?.colors?.length
    ? palette.colors.reduce((acc, color, i) => {
        (acc as Record<string, string>)[`--palette-${i}`] = color;
        return acc;
      }, {} as React.CSSProperties)
    : {};

  return (
    <div style={paletteStyles} className="contents">
      <NasaBackground />
      <WeatherEffects />
      {children}
    </div>
  );
}
