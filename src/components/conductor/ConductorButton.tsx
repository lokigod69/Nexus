'use client';

import { useUIStore } from '@/stores/uiStore';

export function ConductorButton() {
  const conductorOpen = useUIStore(s => s.conductorOpen);
  const toggleConductor = useUIStore(s => s.toggleConductor);

  if (conductorOpen) return null;

  return (
    <button
      onClick={() => toggleConductor(true)}
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-12 h-12 rounded-full border border-white/10 bg-surface/90 backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-110 hover:border-white/20 hover:shadow-[0_0_20px_rgba(120,120,255,0.15)] group"
      title="Ask the Conductor"
    >
      <span className="text-lg text-text-secondary group-hover:text-white transition-colors duration-300">
        ◈
      </span>
      {/* Subtle ambient glow */}
      <div
        className="absolute inset-0 rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(120,140,255,0.15) 0%, transparent 70%)',
        }}
      />
    </button>
  );
}
