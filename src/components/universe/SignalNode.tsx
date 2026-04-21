'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { Signal } from '@/types';
import { getCategoryColor } from '@/lib/utils/categories';

interface SignalNodeProps {
  signal: Signal;
  isSelected: boolean;
  isFiltered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  hoveredId: string | null;
  selectedId: string | null;
  totalNodes: number;
}

function getNodeBaseSize(status: string, hoursSinceCreation: number): number {
  if (status === 'starred') return 1.2;
  if (hoursSinceCreation < 24) return 0.8;
  if (status === 'active' || status === 'playground') return 0.6;
  if (status === 'inbox' || status === 'triaged') return 0.5;
  if (status === 'archived') return 0.3;
  return 0.6;
}

function getEmissiveIntensity(status: string, hoursSinceCreation: number): number {
  let intensity: number;
  if (hoursSinceCreation < 24) intensity = 2.0;
  else if (hoursSinceCreation < 72) intensity = 1.5;
  else if (hoursSinceCreation < 168) intensity = 1.0;
  else intensity = 0.3;

  // Starred nodes get a minimum of 1.5
  if (status === 'starred') intensity = Math.max(1.5, intensity);
  return intensity;
}

export function SignalNode({ signal, isSelected, isFiltered, onSelect, onHover, hoveredId, selectedId, totalNodes }: SignalNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  const categoryColor = useMemo(() => new THREE.Color(getCategoryColor(signal.category)), [signal.category]);
  const categoryColorStr = useMemo(() => getCategoryColor(signal.category), [signal.category]);

  const hoursSinceCreation = useMemo(
    () => (Date.now() - new Date(signal.createdAt).getTime()) / 3600000,
    [signal.createdAt]
  );
  const isFresh = hoursSinceCreation < 24;
  const isStarred = signal.status === 'starred';

  const scaleFactor = useMemo(() => Math.max(0.3, 1.0 - totalNodes / 300), [totalNodes]);
  const nodeSize = useMemo(
    () => getNodeBaseSize(signal.status, hoursSinceCreation) * scaleFactor,
    [signal.status, hoursSinceCreation, scaleFactor]
  );
  const emissiveIntensity = useMemo(
    () => getEmissiveIntensity(signal.status, hoursSinceCreation),
    [signal.status, hoursSinceCreation]
  );

  // Dimming: unfiltered=0.1, another node selected=0.4, otherwise=1.0
  const targetOpacity = !isFiltered ? 0.1 : (selectedId && !isSelected ? 0.4 : 1.0);
  const targetScale = isFiltered ? (hovered || isSelected ? 1.3 : 1.0) : 0.3;

  const position = useMemo<[number, number, number]>(
    () => [signal.posX ?? 0, signal.posY ?? 0, signal.posZ ?? 0],
    [signal.posX, signal.posY, signal.posZ]
  );

  // Label text
  const labelText = useMemo(
    () => hovered ? signal.title : (signal.title.length > 30 ? signal.title.substring(0, 30) + '…' : signal.title),
    [signal.title, hovered]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    // Gentle floating
    const floatOffset = Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.15;
    mesh.position.y = position[1] + floatOffset;

    // Fresh node pulse
    const pulseScale = isFresh
      ? 1.0 + Math.sin(state.clock.elapsedTime * 3) * 0.08
      : 1.0;

    // Smooth scale transition
    const currentScale = mesh.scale.x;
    const desired = nodeSize * targetScale * pulseScale;
    const newScale = THREE.MathUtils.lerp(currentScale, desired, 0.1);
    mesh.scale.setScalar(newScale);
  });

  const handlePointerOver = useCallback((e: THREE.Event) => {
    (e as any).stopPropagation();
    setHovered(true);
    onHover(signal.id);
    document.body.style.cursor = 'pointer';
  }, [onHover, signal.id]);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    onHover(null);
    document.body.style.cursor = 'auto';
  }, [onHover]);

  const handleClick = useCallback((e: THREE.Event) => {
    (e as any).stopPropagation();
    onSelect(signal.id);
  }, [onSelect, signal.id]);

  const age = useMemo(() => {
    if (hoursSinceCreation < 1) return 'just now';
    if (hoursSinceCreation < 24) return `${Math.floor(hoursSinceCreation)}h ago`;
    const days = Math.floor(hoursSinceCreation / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }, [hoursSinceCreation]);

  const sourceLabel = useMemo(() => {
    if (signal.source === 'brain_dump') return 'Brain Dump';
    return signal.source;
  }, [signal.source]);

  // Only render point lights on starred/fresh filtered nodes for performance
  const showPointLight = isFiltered && (isStarred || isFresh);

  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <icosahedronGeometry args={[nodeSize, 1]} />
        <meshStandardMaterial
          color={categoryColor}
          emissive={categoryColor}
          emissiveIntensity={hovered || isSelected ? emissiveIntensity * 1.8 : emissiveIntensity}
          transparent
          opacity={targetOpacity}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Point light per node — only on starred/fresh for performance */}
      {showPointLight && (
        <pointLight
          color={categoryColor}
          intensity={isFresh ? 0.5 : 0.3}
          distance={isFresh ? 10 : 5}
          decay={2}
        />
      )}

      {/* Glow sphere */}
      <mesh scale={[nodeSize * 2.2, nodeSize * 2.2, nodeSize * 2.2]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={categoryColor}
          transparent
          opacity={(hovered || isSelected ? 0.3 : 0.18) * targetOpacity}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Starred golden aura */}
      {isStarred && (
        <mesh scale={[nodeSize * 3.0, nodeSize * 3.0, nodeSize * 3.0]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial
            color="#ffd700"
            transparent
            opacity={0.15 * targetOpacity}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Persistent label below node */}
      {isFiltered && (
        <Billboard position={[0, -nodeSize * 2.8, 0]} follow>
          <Text
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="top"
            fillOpacity={hovered ? 1.0 : 0.7 * targetOpacity}
            maxWidth={10}
          >
            {labelText}
          </Text>
        </Billboard>
      )}

      {/* Tooltip on hover */}
      {hovered && isFiltered && (
        <Html distanceFactor={40} style={{ pointerEvents: 'none' }}>
          <div
            className="rounded-xl px-3 py-2.5 whitespace-nowrap shadow-xl"
            style={{
              background: 'rgba(13, 13, 20, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderLeft: `3px solid ${categoryColorStr}`,
            }}
          >
            <div className="text-sm font-sans text-text-primary max-w-[220px] truncate">
              {signal.title}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-text-muted">
              <span
                className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: categoryColorStr }}
              />
              <span style={{ color: categoryColorStr }}>{signal.category}</span>
              <span>·</span>
              <span>{sourceLabel}</span>
              <span>·</span>
              <span>{age}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
