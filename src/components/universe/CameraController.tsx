'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Signal } from '@/types';

interface CameraControllerProps {
  selectedSignal: Signal | null;
  signals: Signal[];
  categoryFilter: string | undefined;
  defaultPosition?: THREE.Vector3;
  defaultLookAt?: THREE.Vector3;
}

export interface CameraControllerHandle {
  recenter: () => void;
}

const FALLBACK_POSITION = new THREE.Vector3(0, 40, 120);
const CAMERA_OFFSET = new THREE.Vector3(10, 8, 25);
const LERP_SPEED = 0.04;

export const CameraController = forwardRef<CameraControllerHandle, CameraControllerProps>(
  function CameraController({ selectedSignal, signals, categoryFilter, defaultPosition, defaultLookAt }, ref) {
    const controlsRef = useRef<any>(null);
    const { camera } = useThree();
    const defaultPos = defaultPosition ?? FALLBACK_POSITION;
    const defaultTarget = defaultLookAt ?? new THREE.Vector3(0, 0, 0);
    const targetPos = useRef(defaultPos.clone());
    const targetLookAt = useRef(defaultTarget.clone());
    const lastInteraction = useRef(Date.now());
    const isAnimating = useRef(false);

    // Expose recenter to parent
    useImperativeHandle(ref, () => ({
      recenter() {
        targetPos.current.copy(defaultPos);
        targetLookAt.current.copy(defaultTarget);
        isAnimating.current = true;
      },
    }), [defaultPos, defaultTarget]);

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
        targetPos.current.copy(defaultPos);
        targetLookAt.current.copy(defaultTarget);
        isAnimating.current = true;
      }
    }, [selectedSignal, categoryFilter, signals, defaultPos, defaultTarget]);

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
        const idle = Date.now() - lastInteraction.current > 10000;
        controlsRef.current.autoRotate = idle;
      }
    });

    return (
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={1.2}
        panSpeed={0.5}
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={5}
        maxDistance={500}
        makeDefault
        onStart={handleInteraction}
      />
    );
  }
);
