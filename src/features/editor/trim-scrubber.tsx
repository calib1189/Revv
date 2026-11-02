"use client";

import { useEffect, useRef, useState } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const FILMSTRIP_FRAMES = 10;
const SEEK_TIMEOUT_MS = 2500;

/** Draws a strip of real frames from the clip into `canvas` — the
 * thumbnails behind the trim handles. Uses its own off-screen <video>
 * (the editor's preview element is busy playing), at a real if off-screen
 * size: WebKit stops decoding a video it considers invisible, the same
 * trap documented in video-editor.tsx. Best-effort: any seek that doesn't
 * land in time ends the strip where it is rather than holding anything
 * up, and the track simply stays plain. */
function useFilmstrip(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  source: File | undefined,
  duration: number,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source || !(duration > 0)) return;
    // Its own URL for its own element, revoked with it — never borrowing
    // the editor's, whose lifetime it doesn't control.
    const sourceUrl = URL.createObjectURL(source);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.style.cssText = "position:fixed;left:-9999px;top:0;width:160px;height:160px;";
    document.body.appendChild(video);

    function seekTo(time: number): Promise<boolean> {
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          video.removeEventListener("seeked", onSeeked);
          resolve(false);
        }, SEEK_TIMEOUT_MS);
        function onSeeked() {
          clearTimeout(timer);
          resolve(true);
        }
        video.addEventListener("seeked", onSeeked, { once: true });
        video.currentTime = time;
      });
    }

    function waitForMetadata(): Promise<boolean> {
      return new Promise((resolve) => {
        if (video.readyState >= 1) return resolve(true);
        const timer = setTimeout(() => resolve(false), SEEK_TIMEOUT_MS * 2);
        video.addEventListener(
          "loadeddata",
          () => {
            clearTimeout(timer);
            resolve(true);
          },
          { once: true },
        );
        video.addEventListener(
          "error",
          () => {
            clearTimeout(timer);
            resolve(false);
          },
          { once: true },
        );
      });
    }

    (async () => {
      video.src = sourceUrl;
      if (!(await waitForMetadata()) || cancelled) return;
      const vw = video.videoWidth || 9;
      const vh = video.videoHeight || 16;
      const frameH = 96;
      const frameW = Math.round((frameH * vw) / vh);
      canvas.width = frameW * FILMSTRIP_FRAMES;
      canvas.height = frameH;
      for (let i = 0; i < FILMSTRIP_FRAMES; i += 1) {
        if (cancelled) return;
        const t = Math.min(duration - 0.05, (duration * (i + 0.5)) / FILMSTRIP_FRAMES);
        if (!(await seekTo(Math.max(0, t))) || cancelled) return;
        ctx.drawImage(video, i * frameW, 0, frameW, frameH);
      }
    })();

    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(sourceUrl);
    };
  }, [canvasRef, source, duration]);
}

export function TrimScrubber({
  duration,
  trimStart,
  trimEnd,
  onChange,
  minDuration = 1,
  source,
  getCurrentTime,
}: {
  duration: number;
  trimStart: number;
  trimEnd: number;
  onChange: (start: number, end: number) => void;
  minDuration?: number;
  /** The clip itself — enables the filmstrip. */
  source?: File;
  /** Read every frame to move the playhead without re-rendering. */
  getCurrentTime?: () => number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  useFilmstrip(filmstripRef, source, duration);

  useEffect(() => {
    if (!getCurrentTime) return;
    let raf: number;
    function tick() {
      const el = playheadRef.current;
      if (el && duration > 0) {
        const pct = clamp(getCurrentTime!() / duration, 0, 1) * 100;
        el.style.left = `${pct}%`;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getCurrentTime, duration]);

  // Not invoked during render — only from the pointerdown handlers below.
  function startDrag(handle: "start" | "end", downEvent: React.PointerEvent) {
    downEvent.preventDefault();
    downEvent.stopPropagation();
    const track = trackRef.current;
    if (!track) return;
    setDragging(handle);

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
      window.removeEventListener("pointercancel", up);
      setDragging(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const selected = Math.max(0, trimEnd - trimStart);

  return (
    <div className="px-5 pb-1 pt-3">
      <div ref={trackRef} className="relative h-14">
        <div className="absolute inset-0 overflow-hidden rounded-[10px] bg-white/[0.08]">
          <canvas ref={filmstripRef} className="h-full w-full object-cover" />
        </div>
        {/* Everything outside the kept range is dimmed, so the selection
            reads as the bright window in the middle. */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-[10px] bg-black/65"
          style={{ width: `${startPct}%` }}
        />
        <div
          className="absolute inset-y-0 right-0 rounded-r-[10px] bg-black/65"
          style={{ width: `${100 - endPct}%` }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 border-y-[3px] border-white"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />
        {getCurrentTime && (
          <span
            ref={playheadRef}
            aria-hidden
            className="pointer-events-none absolute -bottom-1 -top-1 w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.4)]"
          />
        )}
        <TrimHandle side="start" pct={startPct} active={dragging === "start"} onPointerDown={(e) => startDrag("start", e)} />
        <TrimHandle side="end" pct={endPct} active={dragging === "end"} onPointerDown={(e) => startDrag("end", e)} />
      </div>
      <div className="mt-2.5 tabular-nums flex items-center justify-between text-[0.75rem] text-white/50">
        <span>{trimStart.toFixed(1)}s</span>
        <span className="font-semibold text-white">{selected.toFixed(1)}s selected</span>
        <span>{trimEnd.toFixed(1)}s</span>
      </div>
    </div>
  );
}

function TrimHandle({
  side,
  pct,
  active,
  onPointerDown,
}: {
  side: "start" | "end";
  pct: number;
  active: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      role="slider"
      aria-label={side === "start" ? "Trim start" : "Trim end"}
      aria-valuenow={Math.round(pct)}
      onPointerDown={onPointerDown}
      className="absolute inset-y-0 z-10 flex w-8 cursor-ew-resize touch-none items-center justify-center"
      style={{ left: `${pct}%`, transform: side === "start" ? "translateX(-80%)" : "translateX(-20%)" }}
    >
      <span
        className={`flex h-full w-4 items-center justify-center bg-white transition-transform duration-150 ${
          side === "start" ? "rounded-l-[8px]" : "rounded-r-[8px]"
        } ${active ? "scale-y-110" : ""}`}
      >
        <span className="h-4 w-[3px] rounded-full bg-black/45" />
      </span>
    </div>
  );
}
