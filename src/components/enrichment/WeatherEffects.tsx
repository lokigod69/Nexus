'use client';

import { useEffect, useState, useMemo } from 'react';
import { useEnrichmentStore } from '@/stores/enrichmentStore';
import type { WeatherState } from '@/types';

function RainEffect() {
  const particles = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.6 + Math.random() * 0.4,
      opacity: 0.2 + Math.random() * 0.3,
    }));
  }, []);

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="rain-particle"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-2%',
            width: '1px',
            height: '15px',
            background: `rgba(100, 160, 255, ${p.opacity})`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </>
  );
}

function SnowEffect() {
  const particles = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 4 + Math.random() * 4,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.4,
    }));
  }, []);

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="snow-particle"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-2%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: `rgba(255, 255, 255, ${p.opacity})`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </>
  );
}

function ClearEffect() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 200, 80, 0.04) 0%, transparent 60%)',
      }}
    />
  );
}

function ThunderstormEffect() {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleFlash = () => {
      const delay = 8000 + Math.random() * 7000; // 8-15 seconds
      timeout = setTimeout(() => {
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
        scheduleFlash();
      }, delay);
    };
    scheduleFlash();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      <RainEffect />
      {flash && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.08)',
            animation: 'thunderFlash 0.15s ease-out',
          }}
        />
      )}
    </>
  );
}

function CloudFogEffect() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.15)',
      }}
    />
  );
}

function WeatherOverlay({ condition }: { condition: WeatherState['condition'] }) {
  switch (condition) {
    case 'rain':
      return <RainEffect />;
    case 'snow':
      return <SnowEffect />;
    case 'clear':
      return <ClearEffect />;
    case 'thunderstorm':
      return <ThunderstormEffect />;
    case 'clouds':
    case 'fog':
      return <CloudFogEffect />;
    default:
      return null;
  }
}

export function WeatherEffects() {
  const weather = useEnrichmentStore(s => s.weather);
  const isEnabled = useEnrichmentStore(s => s.isEnabled);

  if (!isEnabled('weather') || !weather) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 10 }}
    >
      <WeatherOverlay condition={weather.condition} />
    </div>
  );
}
