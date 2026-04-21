'use client';

import { useRef, useEffect } from 'react';

const SPACING = 40;
const BASE_ALPHA = 0.06;
const BRIGHT_ALPHA = 0.10;
const DOT_SIZE = 6; // diameter of the soft dot stamp
const INFLUENCE = 100;
const INFLUENCE_SQ = INFLUENCE * INFLUENCE;
const LERP_FACTOR = 0.08;

export function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const smoothMouse = useRef({ x: -9999, y: -9999 });
  const rafId = useRef(0);
  const dotStamp = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    // Pre-render a soft radial gradient dot to an offscreen canvas
    const stamp = document.createElement('canvas');
    stamp.width = DOT_SIZE * dpr;
    stamp.height = DOT_SIZE * dpr;
    const sctx = stamp.getContext('2d')!;
    const half = (DOT_SIZE * dpr) / 2;
    const grad = sctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, stamp.width, stamp.height);
    dotStamp.current = stamp;

    function resize() {
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + 'px';
      canvas!.style.height = window.innerHeight + 'px';
    }

    function onMouseMove(e: MouseEvent) {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mx = smoothMouse.current.x;
      const my = smoothMouse.current.y;
      const stampEl = dotStamp.current;
      if (!stampEl) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const halfDot = DOT_SIZE / 2;

      for (let x = SPACING; x < w; x += SPACING) {
        for (let y = SPACING; y < h; y += SPACING) {
          const dx = x - mx;
          const dy = y - my;
          const distSq = dx * dx + dy * dy;
          let alpha = BASE_ALPHA;
          if (distSq < INFLUENCE_SQ) {
            const t = 1 - Math.sqrt(distSq) / INFLUENCE;
            alpha = BASE_ALPHA + (BRIGHT_ALPHA - BASE_ALPHA) * t;
          }
          ctx.globalAlpha = alpha;
          ctx.drawImage(stampEl, (x - halfDot) * dpr, (y - halfDot) * dpr, DOT_SIZE * dpr, DOT_SIZE * dpr);
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      // Lerp smooth mouse toward actual mouse
      smoothMouse.current.x += (mouse.current.x - smoothMouse.current.x) * LERP_FACTOR;
      smoothMouse.current.y += (mouse.current.y - smoothMouse.current.y) * LERP_FACTOR;
      draw();
      rafId.current = requestAnimationFrame(loop);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', resize);
    resize();
    rafId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
}
