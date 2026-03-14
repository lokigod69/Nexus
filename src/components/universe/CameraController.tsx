'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Signal } from '@/types';

interface CameraControllerProps {
  selectedSignal: Signal | null;
  signals: Signal[];
  categoryFilter: string | undefined;
}

const DEFAULT_POSITION = new THREE.Vector3(0, 30, 80);
const CAMERA_OFFSET = new THREE.Vector3(5, 3, 12);
const LERP_SPEED = 0.04;

export function CameraController({ selectedSignal, signals, categoryFilter }: CameraControllerProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const targetPos = useRef(DEFAULT_POSITION.clone());
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const lastInteraction = useRef(Date.now());
  const isAnimating = useRef(false);

  // Compute target position based on selection or filter
  useEffect(() => {
    if (selectedSignal && selectedSignal.posX != null) {
      // Fly to selected node
      const nodePos = new THREE.Vector3(selectedSignal.posX, selectedSignal.posY ?? 0, selectedSignal.posZ ?? 0);
      targetPos.current.copy(nodePos).add(CAMERA_OFFSET);
      targetLookAt.current.copy(nodePos);
      isAnimating.current = true;
    } else if (categoryFilter) {
      // Center on category cluster
      const filtered = signals.filter(s => s.category === categoryFilter && s.posX != null);
      if (filtered.length > 0) {
        const centroid = new THREE.Vector3();
        filtered.forEach(s => centroid.add(new THREE.Vector3(s.posX!, s.posY ?? 0, s.posZ ?? 0)));
        centroid.divideScalar(filtered.length);
        targetPos.current.set(centroid.x, centroid.y + 15, centroid.z + 40);
        targetLookAt.current.copy(centroid);
        isAnimating.current = true;
      }
    } else {
      targetPos.current.copy(DEFAULT_POSITION);
      targetLookAt.current.set(0, 0, 0);
      isAnimating.current = true;
    }
  }, [selectedSignal, categoryFilter, signals]);

  useFrame(() => {
    if (!isAnimating.current) return;

    camera.position.lerp(targetPos.current, LERP_SPEED);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, LERP_SPEED);
      controlsRef.current.update();
    }

    // Stop animating when close enough
    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      isAnimating.current = false;
    }
  });

  const handleInteraction = () => {
    lastInteraction.current = Date.now();
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  };

  // Resume auto-rotate after inactivity
  useFrame(() => {
    if (controlsRef.current && !isAnimating.current) {
      const idle = Date.now() - lastInteraction.current > 5000;
      controlsRef.current.autoRotate = idle;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      panSpeed={0.5}
      autoRotate
      autoRotateSpeed={0.3}
      minDistance={5}
      maxDistance={200}
      makeDefault
      onStart={handleInteraction}
    />
  );
}
