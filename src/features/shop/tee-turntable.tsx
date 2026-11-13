"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Degrees per pixel of drag. */
const DRAG = 0.55;
/** The idle sway either side of the face you're looking at, and its pace. */
const SWAY_DEG = 18;
const SWAY_MS = 1700;
/** How long after you let go before it starts swaying again. */
const RESUME_MS = 1800;

/**
 * The tee, front and back, as one shirt you can turn. At rest it sways
 * gently either side of whichever side faces you. Drag sideways to turn
 * it (a flick carries on and eases off); when you let go it settles on
 * the nearest side, so it never rests edge-on. Scrolling up and down
 * still scrolls the page.
 */
export function TeeTurntable({
  front,
  back,
  alt,
  snapTo,
  onSideChange,
  className = "",
}: {
  front: string;
  back: string;
  alt: string;
  /** Turn to a side (the Front / Back buttons); `n` changes on every tap. */
  snapTo?: { side: "front" | "back"; n: number } | null;
  onSideChange?: (side: "front" | "back") => void;
  className?: string;
}) {
  const [angle, setAngle] = useState(-SWAY_DEG);
  const angleRef = useRef(-SWAY_DEG);
  const velocity = useRef(0);
  const drag = useRef<{ x: number; y: number; start: number; lastX: number; lastT: number; decided: boolean; horizontal: boolean } | null>(null);
  const idleFrom = useRef(0);
  const [hinted, setHinted] = useState(false);
  const facingRef = useRef<"front" | "back">("front");

  const set = useCallback(
    (a: number) => {
      angleRef.current = a;
      setAngle(a);
      const facing = Math.cos((a * Math.PI) / 180) >= 0 ? "front" : "back";
      if (facing !== facingRef.current) {
        facingRef.current = facing;
        onSideChange?.(facing);
      }
    },
    [onSideChange],
  );

  // One loop: a flick's coast, then easing to the nearest side and
  // swaying gently around it.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(48, t - last);
      last = t;
      if (!drag.current) {
        if (Math.abs(velocity.current) > 0.02) {
          set(angleRef.current + velocity.current * dt);
          velocity.current *= Math.pow(0.92, dt / 16);
          idleFrom.current = t + RESUME_MS;
        } else {
          velocity.current = 0;
          const face = Math.round(angleRef.current / 180) * 180;
          const sway = reduced || t < idleFrom.current ? 0 : SWAY_DEG * Math.sin((t - idleFrom.current) / SWAY_MS);
          const goal = face + sway;
          set(angleRef.current + (goal - angleRef.current) * Math.min(1, dt / 220));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [set]);

  // Front / Back: turn toward the nearest rotation that shows that side.
  // Nudging it past halfway is enough; the loop eases the rest.
  useEffect(() => {
    if (!snapTo) return;
    const base = snapTo.side === "front" ? 0 : 180;
    const a = angleRef.current;
    const goal = base + Math.round((a - base) / 360) * 360;
    velocity.current = 0;
    idleFrom.current = performance.now() + RESUME_MS;
    set(goal + (a - goal) * 0.4);
  }, [snapTo, set]);

  const rad = (angle * Math.PI) / 180;
  const edge = Math.abs(Math.sin(rad));

  const face = (src: string, flipped: boolean) => (
    // eslint-disable-next-line @next/next/no-img-element -- transparent cut-out, sized by its box
    <img
      src={src}
      alt={flipped ? "" : alt}
      draggable={false}
      className="absolute inset-0 h-full w-full object-contain"
      style={{
        transform: flipped ? "rotateY(180deg)" : undefined,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        filter: `brightness(${1 - edge * 0.22})`,
      }}
    />
  );

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ perspective: 1200, touchAction: "pan-y" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        velocity.current = 0;
        drag.current = { x: e.clientX, y: e.clientY, start: angleRef.current, lastX: e.clientX, lastT: performance.now(), decided: false, horizontal: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.decided && Math.abs(dx) + Math.abs(dy) > 6) {
          d.decided = true;
          d.horizontal = Math.abs(dx) > Math.abs(dy);
        }
        if (!d.horizontal) return;
        const now = performance.now();
        velocity.current = ((e.clientX - d.lastX) * DRAG) / Math.max(1, now - d.lastT);
        d.lastX = e.clientX;
        d.lastT = now;
        set(d.start + dx * DRAG);
        if (!hinted) setHinted(true);
      }}
      onPointerUp={() => {
        drag.current = null;
        idleFrom.current = performance.now() + RESUME_MS;
      }}
      onPointerCancel={() => {
        drag.current = null;
        idleFrom.current = performance.now() + RESUME_MS;
      }}
    >
      {/* Its shadow, narrowing as it turns side-on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[1%] left-1/2 h-[5%] w-[62%] rounded-[50%] bg-black/55 blur-[10px]"
        style={{ transform: `translateX(-50%) scaleX(${0.45 + 0.55 * Math.abs(Math.cos(rad))})` }}
      />
      <div className="relative mx-auto aspect-[823/979] w-full" style={{ transformStyle: "preserve-3d", transform: `rotateY(${angle}deg)` }}>
        {face(front, false)}
        {face(back, true)}
      </div>
      {!hinted && (
        <span className="pointer-events-none absolute bottom-[-4px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-[0.6875rem] font-semibold text-white/85 backdrop-blur-md">
          Drag to turn it
        </span>
      )}
    </div>
  );
}
