'use client';

import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';
import type { Signal } from '@/types';
import { CATEGORIES } from '@/lib/utils/categories';

interface ClusterLabelsProps {
  signals: Signal[];
  categoryFilter: string | undefined;
}

export function ClusterLabels({ signals, categoryFilter }: ClusterLabelsProps) {
  const clusters = useMemo(() => {
    const grouped = new Map<string, { x: number; y: number; z: number; count: number }>();

    signals.forEach(s => {
      if (s.posX == null) return;
      const existing = grouped.get(s.category);
      if (existing) {
        existing.x += s.posX!;
        existing.y += (s.posY ?? 0);
        existing.z += (s.posZ ?? 0);
        existing.count++;
      } else {
        grouped.set(s.category, {
          x: s.posX!,
          y: s.posY ?? 0,
          z: s.posZ ?? 0,
          count: 1,
        });
      }
    });

    const result: Array<{ id: string; label: string; color: string; position: [number, number, number] }> = [];

    grouped.forEach((data, categoryId) => {
      if (data.count < 2) return; // Only show labels for clusters with 2+ signals
      const cat = CATEGORIES.find(c => c.id === categoryId);
      if (!cat) return;

      result.push({
        id: categoryId,
        label: cat.label,
        color: cat.color,
        position: [
          data.x / data.count,
          data.y / data.count + 4, // Offset above centroid
          data.z / data.count,
        ],
      });
    });

    return result;
  }, [signals]);

  return (
    <group>
      {clusters.map(cluster => {
        const isActive = !categoryFilter || categoryFilter === cluster.id;
        return (
          <Billboard key={cluster.id} position={cluster.position} follow>
            <Text
              fontSize={1.8}
              color={cluster.color}
              anchorX="center"
              anchorY="middle"
              fillOpacity={isActive ? 0.5 : 0.1}
              font={undefined}
            >
              {cluster.label}
            </Text>
          </Billboard>
        );
      })}
    </group>
  );
}
