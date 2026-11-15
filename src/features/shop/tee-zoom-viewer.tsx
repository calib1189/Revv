"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";

type Side = "front" | "back";

/** The images' shared shape (teePhotos3d and teePhotos4k): 823 x 979. */
const ASPECT = 823 / 979;
const MAX_SCALE = 6;
const DOUBLE_TAP_SCALE = 3;
const DOUBLE_TAP_MS = 300;

interface View {
  scale: number;
  x: number;
  y: number;
}
const RESET: View = { scale: 1, x: 0, y: 0 };

/**
 * A tee full screen, in 4K: pinch or double-tap to zoom in on the print,
 * drag to look around, Front / Back to switch sides. Shows the small
 * turntable image straight away and swaps in the 4K one when it's loaded,
 * so there's never an empty screen.
 */
export function TeeZoomViewer({
  name,
  photos,
  previews,
  initialSide,
  onClose,
}: {
  name: string;
  photos: Record<Side, string>;
  /** Already loaded (the turntable's), shown until the 4K one arrives. */
  previews: Record<Side, string>;
  initialSide: Side;
  onClose: () => void;
}) {
  const [side, setSide] = useState<Side>(initialSide);
  const [loaded, setLoaded] = useState<Record<Side, boolean>>({ front: false, back: false });
  const [view, setView] = useState<View>(RESET);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; view: View; mid: { x: number; y: number } } | null>(null);
  const pan = useRef<{ x: number; y: number; view: View } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const moved = useRef(false);
  // While a finger is down the image follows it exactly; on release it eases.
  const [touching, setTouching] = useState(false);

  // The image's size at 1x: as large as fits the screen.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fitW = Math.min(box.w, box.h * ASPECT);
  const fitH = fitW / ASPECT;

  /** Keeps the zoomed image covering the screen rather than drifting off. */
  const clamp = useCallback(
    (v: View): View => {
      const scale = Math.min(MAX_SCALE, Math.max(1, v.scale));
      const maxX = Math.max(0, (fitW * scale - box.w) / 2);
      const maxY = Math.max(0, (fitH * scale - box.h) / 2);
      return { scale, x: Math.min(maxX, Math.max(-maxX, v.x)), y: Math.min(maxY, Math.max(-maxY, v.y)) };
    },
    [fitW, fitH, box.w, box.h],
  );

  /** Zoom to `scale` keeping the point under (px, py) where it is. */
  const zoomAt = useCallback(
    (from: View, scale: number, px: number, py: number): View => {
      const s = Math.min(MAX_SCALE, Math.max(1, scale));
      const k = s / from.scale;
      return clamp({ scale: s, x: px - (px - from.x) * k, y: py - (py - from.y) * k });
    },
    [clamp],
  );

  /** A pointer's position relative to the middle of the screen. */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 };
  };

  // Escape closes the viewer, and only the viewer: the sheet under it
  // listens for Escape too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  function switchSide(next: Side) {
    setSide(next);
    setView(RESET);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-[radial-gradient(80%_60%_at_50%_42%,#4a4a52,#141417_75%)] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${name}, ${side}, full screen`}
    >
      <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <p className="min-w-0 truncate text-[0.9375rem] font-semibold">
          {name} <span className="font-normal text-white/60">· 4K</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close full screen"
          className="pressable flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/12 backdrop-blur-md"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={stage}
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = local(e);
          pointers.current.set(e.pointerId, p);
          moved.current = false;
          setTouching(true);
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
            pan.current = null;
          } else if (pointers.current.size === 1) {
            pan.current = { x: p.x, y: p.y, view };
          }
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          const p = local(e);
          pointers.current.set(e.pointerId, p);
          const g = gesture.current;
          if (g && pointers.current.size >= 2) {
            const [a, b] = [...pointers.current.values()];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const zoomed = zoomAt(g.view, g.view.scale * (dist / Math.max(1, g.dist)), g.mid.x, g.mid.y);
            setView(clamp({ ...zoomed, x: zoomed.x + mid.x - g.mid.x, y: zoomed.y + mid.y - g.mid.y }));
            moved.current = true;
            return;
          }
          const start = pan.current;
          if (!start) return;
          const dx = p.x - start.x;
          const dy = p.y - start.y;
          if (Math.abs(dx) + Math.abs(dy) > 6) moved.current = true;
          if (start.view.scale > 1) setView(clamp({ ...start.view, x: start.view.x + dx, y: start.view.y + dy }));
        }}
        onPointerUp={(e) => {
          const p = local(e);
          pointers.current.delete(e.pointerId);
          if (pointers.current.size === 0) setTouching(false);
          if (pointers.current.size < 2) gesture.current = null;
          if (pointers.current.size === 1) {
            // One finger left after a pinch: carry on as a drag from here.
            const [rest] = [...pointers.current.values()];
            pan.current = { x: rest.x, y: rest.y, view };
            return;
          }
          pan.current = null;
          if (moved.current) return;
          // Double-tap: zoom in on that spot, or back out.
          const now = performance.now();
          const prev = lastTap.current;
          if (prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(p.x - prev.x, p.y - prev.y) < 30) {
            lastTap.current = null;
            setView(view.scale > 1 ? RESET : zoomAt(view, DOUBLE_TAP_SCALE, p.x, p.y));
          } else {
            lastTap.current = { t: now, x: p.x, y: p.y };
          }
        }}
        onPointerCancel={(e) => {
          pointers.current.delete(e.pointerId);
          if (pointers.current.size === 0) setTouching(false);
          gesture.current = null;
          pan.current = null;
        }}
        onWheel={(e) => {
          const p = local(e);
          setView((v) => zoomAt(v, v.scale * Math.exp(-e.deltaY / 400), p.x, p.y));
        }}
      >
        {fitW > 0 && (
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: fitW,
              height: fitH,
              marginLeft: -fitW / 2,
              marginTop: -fitH / 2,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transition: touching ? "none" : "transform 180ms ease-out",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- already-loaded turntable image as the placeholder */}
            <img src={previews[side]} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
            {/* eslint-disable-next-line @next/next/no-img-element -- a 3292px image the viewer zooms itself; next/image would resize it down */}
            <img
              key={side}
              src={photos[side]}
              alt={`${name}, ${side}`}
              draggable={false}
              decoding="async"
              onLoad={() => setLoaded((l) => ({ ...l, [side]: true }))}
              className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${loaded[side] ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        )}
        {!loaded[side] && (
          <span className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[0.75rem] font-semibold text-white/80 backdrop-blur-md">
            Loading 4K…
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
        <div className="flex gap-1 rounded-full bg-black/40 p-1 backdrop-blur-md" role="radiogroup" aria-label="Side">
          {(["front", "back"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              onClick={() => switchSide(s)}
              className={`pressable rounded-full px-5 py-2 text-[0.875rem] font-semibold capitalize transition-colors ${
                side === s ? "bg-white text-black" : "text-white/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[0.75rem] text-white/55">
          {view.scale > 1 ? "Drag to look around · double-tap to zoom out" : "Pinch or double-tap to zoom"}
        </p>
      </div>
    </div>,
    document.body,
  );
}
