'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useSignalStore } from '@/stores/signalStore';
import { useUIStore } from '@/stores/uiStore';
import { StarField } from './StarField';
import { SignalNode } from './SignalNode';
import { NodeEdges } from './NodeEdges';
import { CameraController } from './CameraController';
import type { CameraControllerHandle } from './CameraController';
import type { Signal } from '@/types';
import { ClusterLabels } from './ClusterLabels';
import { UniverseHUD } from './UniverseHUD';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

interface Edge {
  source: string;
  target: string;
  score: number;
}

export function UniverseView() {
  const selectedSignalId = useSignalStore(s => s.selectedSignalId);
  const selectSignal = useSignalStore(s => s.selectSignal);
  const filters = useSignalStore(s => s.filters);
  const setFilters = useSignalStore(s => s.setFilters);
  const toggleDetailPanel = useUIStore(s => s.toggleDetailPanel);

  const [universeSignals, setUniverseSignals] = useState<Signal[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const cameraRef = useRef<CameraControllerHandle>(null);

  // Fetch ALL signals (unfiltered) for the universe — independent of sidebar filters
  useEffect(() => {
    async function fetchAllForUniverse() {
      try {
        const res = await fetch('/api/signals?limit=10000');
        if (res.ok) {
          const data = await res.json();
          setUniverseSignals(data.signals || []);
        }
      } catch {
        // silently fail
      }
    }
    fetchAllForUniverse();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key deselects node and closes detail panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedSignalId) {
        selectSignal(null);
        toggleDetailPanel(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSignalId, selectSignal, toggleDetailPanel]);

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
    if (universeSignals.length > 0) {
      fetchEdges();
    }
  }, [universeSignals.length]);

  const signalsWithPositions = useMemo(
    () => universeSignals.filter(s => s.posX != null),
    [universeSignals]
  );

  // Compute bounding box → default camera position that fits all nodes
  const { defaultPosition, defaultLookAt } = useMemo(() => {
    if (signalsWithPositions.length === 0) {
      return {
        defaultPosition: new THREE.Vector3(0, 40, 120),
        defaultLookAt: new THREE.Vector3(0, 0, 0),
      };
    }

    const box = new THREE.Box3();
    signalsWithPositions.forEach(s => {
      box.expandByPoint(new THREE.Vector3(s.posX!, s.posY ?? 0, s.posZ ?? 0));
    });

    const centroid = new THREE.Vector3();
    box.getCenter(centroid);

    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const distance = Math.max(120, sphere.radius * 2.5);

    return {
      defaultPosition: new THREE.Vector3(centroid.x, centroid.y + distance * 0.3, centroid.z + distance),
      defaultLookAt: centroid,
    };
  }, [signalsWithPositions]);

  const selectedSignal = useMemo(
    () => universeSignals.find(s => s.id === selectedSignalId) ?? null,
    [universeSignals, selectedSignalId]
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

  const handlePointerMissed = useCallback(() => {
    selectSignal(null);
    toggleDetailPanel(false);
  }, [selectSignal, toggleDetailPanel]);

  const handleCategoryClick = useCallback((category: string | undefined) => {
    setFilters({ category });
  }, [setFilters]);

  const handleRecenter = useCallback(() => {
    cameraRef.current?.recenter();
  }, []);

  const handleRecompute = useCallback(async () => {
    setRecomputing(true);
    try {
      const res = await fetch('/api/embedding/recompute', { method: 'POST' });
      if (res.ok) {
        // Refetch all signals for the universe
        const sigRes = await fetch('/api/signals?limit=10000');
        if (sigRes.ok) {
          const data = await sigRes.json();
          setUniverseSignals(data.signals || []);
        }
      }
    } catch {
      // silently fail
    } finally {
      setRecomputing(false);
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      {signalsWithPositions.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-text-muted text-sm font-mono">No signals with positions yet</p>
            <p className="text-text-secondary text-xs font-mono">Add signals and compute embeddings to populate the universe</p>
          </div>
        </div>
      ) : null}

      <Canvas
        camera={{ position: [defaultPosition.x, defaultPosition.y, defaultPosition.z], fov: 60, near: 0.1, far: 1000 }}
        onPointerMissed={handlePointerMissed}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#08080d' }}
      >
        <color attach="background" args={['#08080d']} />
        <fog attach="fog" args={['#08080d', 150, 400]} />
        <ambientLight intensity={0.15} />
        <pointLight position={[50, 50, 50]} intensity={0.3} color="#7b8aff" />
        <pointLight position={[-50, -30, -50]} intensity={0.2} color="#ff6bff" />

        <StarField />

        <CameraController
          ref={cameraRef}
          selectedSignal={selectedSignal}
          signals={signalsWithPositions}
          categoryFilter={filters.category}
          defaultPosition={defaultPosition}
          defaultLookAt={defaultLookAt}
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
        onRecenter={handleRecenter}
        onRecompute={handleRecompute}
        recomputing={recomputing}
      />
    </div>
  );
}
