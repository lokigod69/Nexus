'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { StarField } from './StarField';
import { SignalNode } from './SignalNode';
import { NodeEdges } from './NodeEdges';
import { CameraController } from './CameraController';
import { ClusterLabels } from './ClusterLabels';
import { UniverseHUD } from './UniverseHUD';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface Edge {
  source: string;
  target: string;
  score: number;
}

export function UniverseView() {
  const signals = useSignalStore(s => s.signals);
  const selectedSignalId = useSignalStore(s => s.selectedSignalId);
  const selectSignal = useSignalStore(s => s.selectSignal);
  const filters = useSignalStore(s => s.filters);
  const setFilters = useSignalStore(s => s.setFilters);
  const fetchSignals = useSignalStore(s => s.fetchSignals);
  const toggleDetailPanel = useUIStore(s => s.toggleDetailPanel);

  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Refetch signals on mount to get fresh positions (UMAP may have updated after initial fetch)
  useEffect(() => {
    fetchSignals();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch edges from API
  useEffect(() => {
    async function fetchEdges() {
      try {
        const res = await fetch('/api/signals/edges');
        if (res.ok) {
          const data = await res.json();
          setEdges(data.edges || []);
        }
      } catch {
        // Edges are non-critical, silently fail
      }
    }
    if (signals.length > 0) {
      fetchEdges();
    }
  }, [signals.length]);

  const signalsWithPositions = useMemo(
    () => signals.filter(s => s.posX != null),
    [signals]
  );

  const selectedSignal = useMemo(
    () => signals.find(s => s.id === selectedSignalId) ?? null,
    [signals, selectedSignalId]
  );

  const handleSelect = useCallback((id: string) => {
    if (selectedSignalId === id) {
      selectSignal(null);
      toggleDetailPanel(false);
    } else {
      selectSignal(id);
      toggleDetailPanel(true);
    }
  }, [selectedSignalId, selectSignal, toggleDetailPanel]);

  const handleCanvasClick = useCallback((e: any) => {
    // Only deselect if clicking empty space (not a node)
    if (e.target === e.currentTarget || (e.delta && e.delta < 2)) {
      // This fires from the Canvas pointerMissed
    }
  }, []);

  const handlePointerMissed = useCallback(() => {
    selectSignal(null);
    toggleDetailPanel(false);
  }, [selectSignal, toggleDetailPanel]);

  const handleCategoryClick = useCallback((category: string | undefined) => {
    setFilters({ category });
  }, [setFilters]);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [0, 30, 80], fov: 60, near: 0.1, far: 500 }}
        onPointerMissed={handlePointerMissed}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#08080d' }}
      >
        <color attach="background" args={['#08080d']} />
        <fog attach="fog" args={['#08080d', 80, 200]} />
        <ambientLight intensity={0.15} />
        <pointLight position={[50, 50, 50]} intensity={0.3} color="#7b8aff" />
        <pointLight position={[-50, -30, -50]} intensity={0.2} color="#ff6bff" />

        <StarField />

        <CameraController
          selectedSignal={selectedSignal}
          signals={signalsWithPositions}
          categoryFilter={filters.category}
        />

        <ClusterLabels
          signals={signalsWithPositions}
          categoryFilter={filters.category}
        />

        <NodeEdges
          signals={signalsWithPositions}
          edges={edges}
          hoveredId={hoveredId}
          selectedId={selectedSignalId}
          categoryFilter={filters.category}
        />

        {signalsWithPositions.map(signal => (
          <SignalNode
            key={signal.id}
            signal={signal}
            isSelected={signal.id === selectedSignalId}
            isFiltered={!filters.category || signal.category === filters.category}
            onSelect={handleSelect}
            onHover={setHoveredId}
            hoveredId={hoveredId}
            selectedId={selectedSignalId}
            totalNodes={signalsWithPositions.length}
          />
        ))}

        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.5}
            radius={0.8}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <UniverseHUD
        signalCount={signalsWithPositions.length}
        categoryFilter={filters.category}
        onCategoryClick={handleCategoryClick}
      />
    </div>
  );
}
