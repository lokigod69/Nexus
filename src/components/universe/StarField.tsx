'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

const LAYER_CONFIGS = [
  { size: 0.03, baseOpacity: 0.4, frequency: 0.7, phase: 0.0 },
  { size: 0.06, baseOpacity: 0.3, frequency: 0.5, phase: 1.5 },
  { size: 0.1, baseOpacity: 0.5, frequency: 0.3, phase: 3.0 },
];

function generateLayerPositions(count: number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 150 + Math.random() * 100;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  return pos;
}

function StarLayer({ positions, config }: { positions: Float32Array; config: typeof LAYER_CONFIGS[number] }) {
  const materialRef = useRef<THREE.PointsMaterial>(null!);

  useFrame((state) => {
    if (materialRef.current) {
      const t = state.clock.elapsedTime;
      materialRef.current.opacity = config.baseOpacity + 0.3 * Math.sin(t * config.frequency + config.phase);
    }
  });

  return (
    <Points positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        ref={materialRef}
        transparent
        color="#ffffff"
        size={config.size}
        sizeAttenuation
        depthWrite={false}
        opacity={config.baseOpacity}
      />
    </Points>
  );
}

export function StarField({ count = 1500 }: { count?: number }) {
  const layerCount = Math.floor(count / 3);

  const layers = useMemo(
    () => LAYER_CONFIGS.map(() => generateLayerPositions(layerCount)),
    [layerCount]
  );

  return (
    <group>
      {layers.map((positions, idx) => (
        <StarLayer key={idx} positions={positions} config={LAYER_CONFIGS[idx]} />
      ))}
    </group>
  );
}
