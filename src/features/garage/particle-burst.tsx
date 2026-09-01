"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  /** Local-space sheen (dark -> white highlight -> base color) across
   * the particle's own width, defined once at spawn and reused every
   * frame — since it's in local (pre-transform) coordinates, it rotates
   * and moves with the particle for free via the same ctx.rotate the
   * shape itself already goes through, rather than needing to be
   * recomputed. */
  gradient: CanvasGradient;
  rotation: number;
  vRotation: number;
  life: number; // 0-1, counts down
}

const GRAVITY = 0.28;
const LIFETIME_MS = 1700;

function darken(hex: string, amount: number): string {
  const clean = hex.replace("#", "").slice(0, 6);
  const num = parseInt(clean, 16);
  const r = ((num >> 16) & 0xff) * (1 - amount);
  const g = ((num >> 8) & 0xff) * (1 - amount);
  const b = (num & 0xff) * (1 - amount);
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

/** A one-shot confetti burst from the center of its container, hand-
 * rolled on canvas rather than a library — this project already
 * hand-rolls every other piece of canvas/video work (the editor, the
 * camera), and a burst of colored rectangles is genuinely simple enough
 * not to need a dependency for it. Fires once on mount and removes
 * itself; re-mount (change `burstKey`) to fire again. */
export function ParticleBurst({
  colors,
  burstKey,
  count = 70,
  speedMultiplier = 1,
}: {
  colors: string[];
  burstKey: string | number;
  /** More particles for a bigger "jackpot" moment (the final landing)
   * than the quick per-tier sparkle during the climb. */
  count?: number;
  speedMultiplier?: number;
}) {
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
    // The canvas is only ever as big as its container, and the fastest
    // particles can still reach that edge well before their time-based
    // fade (below) makes them transparent — without this, they'd get
    // hard-clipped by the canvas boundary while still visibly opaque,
    // which reads as a "box" drawn right where the canvas ends. Fading
    // every particle out over the last stretch of the container's own
    // radius guarantees nothing is still visible by the time it would
    // hit that edge, regardless of how fast it's moving.
    const maxRadius = Math.min(canvas.width, canvas.height) / 2;
    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.5 + Math.random() * 6) * devicePixelRatio * speedMultiplier;
      const size = (3 + Math.random() * 5) * devicePixelRatio;
      const color = colors[Math.floor(Math.random() * colors.length)];
      // A metallic-foil look — a bright highlight sweeping across each
      // tiny piece rather than a flat fill — same "premium loot" shine
      // every other part of this reveal already has.
      const gradient = ctx!.createLinearGradient(-size / 2, 0, size / 2, 0);
      gradient.addColorStop(0, darken(color, 0.5));
      gradient.addColorStop(0.5, "#ffffff");
      gradient.addColorStop(1, color);
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3 * devicePixelRatio,
        size,
        color,
        gradient,
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

        const distFromCenter = Math.hypot(p.x - cx, p.y - cy);
        // 1 near the center, ramping down to 0 over the outer 35% of the
        // available radius — comfortably faded out before the actual
        // canvas edge, not right at it.
        const edgeFade = 1 - Math.min(1, Math.max(0, (distFromCenter / maxRadius - 0.65) / 0.35));
        p.life = (1 - t) * edgeFade;

        ctx!.save();
        ctx!.globalAlpha = Math.max(0, p.life);
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rotation);
        ctx!.shadowColor = p.color;
        ctx!.shadowBlur = p.size * 1.1;
        ctx!.fillStyle = p.gradient;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- burstKey is the intentional re-trigger; colors/count/speedMultiplier are stable enough in practice
  }, [burstKey]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
