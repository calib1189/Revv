"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Degrees per pixel of drag. */
const DRAG = 0.55;
/** The idle spin: one turn in about 24 seconds. */
const SPIN = 360 / 24000;
/** How long after you let go before it starts turning on its own again. */
const RESUME_MS = 2600;
/** The shirt's depth, as a share of its width, and how many layers make
 * it up: side-on it reads as a solid shirt, not a flat picture. */
const DEPTH = 0.15;
const LAYERS = 14;

/**
 * The tee in 3D: its front and back cut-outs back to back, turning slowly
 * on their own. Drag sideways to spin it (it carries on with a flick and
 * eases to a stop); scrolling up and down still scrolls the page. Light
 * catches it as it turns, and its shadow narrows when it's side-on.
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
  /** Snap to a side (the Front / Back buttons); `n` changes on every tap. */
  snapTo?: { side: "front" | "back"; n: number } | null;
  onSideChange?: (side: "front" | "back") => void;
  className?: string;
}) {
  const [angle, setAngle] = useState(-24);
  const angleRef = useRef(-24);
  const velocity = useRef(0);
  const target = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; start: number; lastX: number; lastT: number; decided: boolean; horizontal: boolean } | null>(null);
  const idleUntil = useRef(0);
  const [hinted, setHinted] = useState(false);
  const reduced = useRef(false);
  const [width, setWidth] = useState(0);
  const box = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    setWidth(el.offsetWidth);
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
  }, []);

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

  // One loop for the idle spin, the flick's coast, and snapping to a side.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(48, t - last);
      last = t;
      if (!drag.current) {
        if (target.current !== null) {
          const diff = target.current - angleRef.current;
          if (Math.abs(diff) < 0.3) {
            set(target.current);
            target.current = null;
          } else set(angleRef.current + diff * Math.min(1, dt / 90));
        } else if (Math.abs(velocity.current) > 0.004) {
          set(angleRef.current + velocity.current * dt);
          velocity.current *= Math.pow(0.94, dt / 16);
        } else if (!reduced.current && t > idleUntil.current) {
          set(angleRef.current + SPIN * dt);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [set]);

  // Snap when a side is asked for: the nearest turn that shows it.
  useEffect(() => {
    if (!snapTo) return;
    const base = snapTo.side === "front" ? 0 : 180;
    const a = angleRef.current;
    target.current = base + Math.round((a - base) / 360) * 360;
    velocity.current = 0;
    idleUntil.current = performance.now() + RESUME_MS * 2;
  }, [snapTo]);

  const rad = (angle * Math.PI) / 180;
  const edge = Math.abs(Math.sin(rad));
  // A soft band of light that slides across as it turns.
  const sheen = 50 + Math.sin(rad) * 60;

  const depth = width * DEPTH;
  const face = (src: string, flipped: boolean) => (
    <div
      className="absolute inset-0"
      style={{
        transform: `${flipped ? "rotateY(180deg) " : ""}translateZ(${depth / 2}px)`,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- transparent cut-out, sized by its box */}
      <img src={src} alt={flipped ? "" : alt} draggable={false} className="h-full w-full object-contain" style={{ filter: `brightness(${1 - edge * 0.3})` }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(105deg, transparent ${sheen - 18}%, rgb(255 255 255 / 0.16) ${sheen}%, transparent ${sheen + 18}%)`,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </div>
  );

  return (
    <div
      className={`relative select-none ${className}`}
      style={{ perspective: 1100, touchAction: "pan-y" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        velocity.current = 0;
        target.current = null;
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
        idleUntil.current = performance.now() + RESUME_MS;
      }}
      onPointerCancel={() => {
        drag.current = null;
        idleUntil.current = performance.now() + RESUME_MS;
      }}
    >
      {/* The shadow it casts, narrowing when it's side-on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[1%] left-1/2 h-[5%] w-[62%] -translate-x-1/2 rounded-[50%] bg-black/55 blur-[10px]"
        style={{ transform: `translateX(-50%) scaleX(${0.45 + 0.55 * Math.abs(Math.cos(rad))})` }}
      />
      <div ref={box} className="relative mx-auto aspect-[823/979] w-full" style={{ transformStyle: "preserve-3d", transform: `rotateY(${angle}deg)` }}>
        {/* The body: the shirt's outline, in shade, layered through its depth. */}
        {depth > 0 &&
          Array.from({ length: LAYERS - 1 }, (_, i) => {
            const z = -depth / 2 + ((i + 1) * depth) / LAYERS;
            return (
              // eslint-disable-next-line @next/next/no-img-element -- a shaded slice of the cut-out
              <img
                key={i}
                src={front}
                alt=""
                aria-hidden
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ transform: `translateZ(${z}px) scale(0.985)`, filter: "brightness(0.32) saturate(0.6)" }}
              />
            );
          })}
        {face(front, false)}
        {face(back, true)}
      </div>
      {!hinted && (
        <span className="pointer-events-none absolute bottom-[-4px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-[0.6875rem] font-semibold text-white/85 backdrop-blur-md">
          Drag to spin
        </span>
      )}
    </div>
  );
}
