"use client";

import { useRef } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function TrimScrubber({
  duration,
  trimStart,
  trimEnd,
  onChange,
  minDuration = 1,
}: {
  duration: number;
  trimStart: number;
  trimEnd: number;
  onChange: (start: number, end: number) => void;
  minDuration?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Not invoked during render — only from the pointerdown handlers below,
  // which themselves only run on an actual pointer event.
  function startDrag(handle: "start" | "end", downEvent: React.PointerEvent) {
    downEvent.preventDefault();
    const track = trackRef.current;
    if (!track) return;

    function move(e: PointerEvent) {
      const rect = track!.getBoundingClientRect();
      const fraction = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const t = fraction * duration;
      if (handle === "start") {
        onChange(clamp(t, 0, trimEnd - minDuration), trimEnd);
      } else {
        onChange(trimStart, clamp(t, trimStart + minDuration, duration));
      }
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;

  return (
    <div className="px-1 py-3">
      <div ref={trackRef} className="relative h-12 rounded-lg bg-white/10">
        <div
          className="absolute inset-y-0 rounded-lg bg-accent/30"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />
        <div
          onPointerDown={(e) => startDrag("start", e)}
          className="absolute top-0 bottom-0 flex w-5 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-md bg-accent"
          style={{ left: `${startPct}%` }}
        >
          <span className="h-5 w-0.5 rounded-full bg-white/80" />
        </div>
        <div
          onPointerDown={(e) => startDrag("end", e)}
          className="absolute top-0 bottom-0 flex w-5 -translate-x-1/2 cursor-ew-resize items-center justify-center rounded-md bg-accent"
          style={{ left: `${endPct}%` }}
        >
          <span className="h-5 w-0.5 rounded-full bg-white/80" />
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        {(trimEnd - trimStart).toFixed(1)}s selected
      </p>
    </div>
  );
}
