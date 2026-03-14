'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import type { Signal } from '@/types';
import { getCategoryColor } from '@/lib/utils/categories';

interface Edge {
  source: string;
  target: string;
  score: number;
}

interface NodeEdgesProps {
  signals: Signal[];
  edges: Edge[];
  hoveredId: string | null;
  selectedId: string | null;
  categoryFilter: string | undefined;
}

function blendColors(c1: string, c2: string): string {
  const color1 = new THREE.Color(c1);
  const color2 = new THREE.Color(c2);
  return new THREE.Color().lerpColors(color1, color2, 0.5).getStyle();
}

export function NodeEdges({ signals, edges, hoveredId, selectedId, categoryFilter }: NodeEdgesProps) {
  const signalMap = useMemo(() => {
    const map = new Map<string, Signal>();
    signals.forEach(s => map.set(s.id, s));
    return map;
  }, [signals]);

  const renderedEdges = useMemo(() => {
    return edges.map(edge => {
      const source = signalMap.get(edge.source);
      const target = signalMap.get(edge.target);
      if (!source || !target) return null;
      if (source.posX == null || target.posX == null) return null;

      // If category filter active, only show edges between matching nodes
      if (categoryFilter) {
        if (source.category !== categoryFilter && target.category !== categoryFilter) return null;
      }

      const color = blendColors(getCategoryColor(source.category), getCategoryColor(target.category));
      const isHighlighted =
        hoveredId === edge.source || hoveredId === edge.target ||
        selectedId === edge.source || selectedId === edge.target;

      return {
        key: `${edge.source}-${edge.target}`,
        points: [
          [source.posX!, source.posY ?? 0, source.posZ ?? 0] as [number, number, number],
          [target.posX!, target.posY ?? 0, target.posZ ?? 0] as [number, number, number],
        ],
        color,
        opacity: isHighlighted ? 0.6 : 0.15,
        lineWidth: isHighlighted ? 1.5 : 1.0,
      };
    }).filter(Boolean) as Array<{
      key: string;
      points: [[number, number, number], [number, number, number]];
      color: string;
      opacity: number;
      lineWidth: number;
    }>;
  }, [edges, signalMap, hoveredId, selectedId, categoryFilter]);

  return (
    <group>
      {renderedEdges.map(edge => (
        <Line
          key={edge.key}
          points={edge.points}
          color={edge.color}
          transparent
          opacity={edge.opacity}
          lineWidth={edge.lineWidth}
        />
      ))}
    </group>
  );
}
