"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRotation: number;
  life: number; // 0-1, counts down
}

const GRAVITY = 0.28;
const LIFETIME_MS = 1700;

/** A one-shot confetti burst from the center of its container, hand-
 * rolled on canvas rather than a library — this project already
 * hand-rolls every other piece of canvas/video work (the editor, the
 * camera), and a burst of colored rectangles is genuinely simple enough
 * not to need a dependency for it. Fires once on mount and removes
 * itself; re-mount (change `burstKey`) to fire again. */
export function ParticleBurst({ colors, burstKey }: { colors: string[]; burstKey: string | number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const parent = canvas!.parentElement;
      canvas!.width = (parent?.clientWidth ?? window.innerWidth) * devicePixelRatio;
      canvas!.height = (parent?.clientHeight ?? window.innerHeight) * devicePixelRatio;
    }
    resize();

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const count = 70;
    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.5 + Math.random() * 6) * devicePixelRatio;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3 * devicePixelRatio,
        size: (3 + Math.random() * 5) * devicePixelRatio,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRotation: (Math.random() - 0.5) * 0.4,
        life: 1,
      };
    });

    let raf: number;
    let cancelled = false;
    const start = performance.now();

    function tick(now: number) {
      if (cancelled) return;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / LIFETIME_MS);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY * devicePixelRatio;
        p.rotation += p.vRotation;
        p.life = 1 - t;

        ctx!.save();
        ctx!.globalAlpha = Math.max(0, p.life);
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx!.restore();
      }

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      }
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- burstKey is the intentional re-trigger; colors is stable enough in practice
  }, [burstKey]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
