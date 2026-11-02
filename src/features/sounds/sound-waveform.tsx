"use client";

import { useEffect, useRef, useState } from "react";

const PEAK_COUNT = 140;
// Decoded audio is held in memory only long enough to take its peaks — at
// a low sample rate, since a waveform this size can't show anything finer.
// A five-minute track at 8kHz is ~19MB of floats instead of ~100MB at the
// device's native rate. Some WebKit builds refuse very low rates, hence
// the fallbacks.
const DECODE_RATES = [8000, 22050, 44100];
const peakCache = new Map<string, number[]>();

function createDecodeContext(): OfflineAudioContext | null {
  for (const rate of DECODE_RATES) {
    try {
      return new OfflineAudioContext(1, 1, rate);
    } catch {
      // Try the next rate.
    }
  }
  return null;
}

/** Real peaks from the audio itself — never a decorative stand-in. Null
 * while decoding, an empty array if decoding failed (the trimmer then
 * shows a plain track rather than a made-up waveform). */
export function useWaveformPeaks(source: File | string | null, cacheKey: string | null) {
  const [decoded, setDecoded] = useState<{ key: string; peaks: number[] } | null>(null);

  useEffect(() => {
    if (!source || !cacheKey || peakCache.has(cacheKey)) return;
    let cancelled = false;
    const setPeaks = (peaks: number[]) => setDecoded({ key: cacheKey, peaks });
    (async () => {
      try {
        const bytes =
          typeof source === "string"
            ? await (await fetch(source)).arrayBuffer()
            : await source.arrayBuffer();
        const ctx = createDecodeContext();
        if (!ctx) throw new Error("No audio decoder");
        const buffer = await ctx.decodeAudioData(bytes);
        const data = buffer.getChannelData(0);
        const bucket = Math.max(1, Math.floor(data.length / PEAK_COUNT));
        const raw: number[] = [];
        for (let i = 0; i < PEAK_COUNT; i += 1) {
          let max = 0;
          const from = i * bucket;
          const to = Math.min(data.length, from + bucket);
          // Strided: every sample in a bucket isn't needed to find its
          // loudest moment to within a pixel.
          for (let j = from; j < to; j += 4) {
            const v = Math.abs(data[j]);
            if (v > max) max = v;
          }
          raw.push(max);
        }
        const loudest = Math.max(...raw, 0.0001);
        const normalized = raw.map((v) => Math.max(0.06, v / loudest));
        peakCache.set(cacheKey, normalized);
        if (!cancelled) setPeaks(normalized);
      } catch {
        if (!cancelled) setPeaks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, cacheKey]);

  if (!cacheKey) return null;
  return peakCache.get(cacheKey) ?? (decoded?.key === cacheKey ? decoded.peaks : null);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Choose which part of a sound plays: the whole track's waveform, with a
 * bright window the length of what will actually be used. Drag the
 * window (or anywhere on the track) to move it. */
export function WaveformTrimmer({
  peaks,
  durationMs,
  windowMs,
  startMs,
  onChange,
  getPlaybackMs,
}: {
  peaks: number[] | null;
  durationMs: number;
  windowMs: number;
  startMs: number;
  onChange: (startMs: number) => void;
  /** Read every frame to move the playhead without re-rendering. */
  getPlaybackMs?: () => number | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);
  const maxStart = Math.max(0, durationMs - windowMs);
  const windowPct = durationMs > 0 ? Math.min(1, windowMs / durationMs) * 100 : 100;
  const startPct = durationMs > 0 ? (startMs / durationMs) * 100 : 0;
  const endPct = Math.min(100, startPct + windowPct);

  useEffect(() => {
    if (!getPlaybackMs) return;
    let raf: number;
    function tick() {
      const el = playheadRef.current;
      const ms = getPlaybackMs!();
      if (el) {
        if (ms === null || durationMs <= 0) {
          el.style.opacity = "0";
        } else {
          el.style.opacity = "1";
          el.style.left = `${clamp(ms / durationMs, 0, 1) * 100}%`;
        }
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getPlaybackMs, durationMs]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!track || maxStart === 0) return;
    e.preventDefault();
    const rect = track.getBoundingClientRect();
    const msPerPx = durationMs / rect.width;
    const pointerMs = (e.clientX - rect.left) * msPerPx;
    // A press inside the window drags it from where it was grabbed; a
    // press outside it jumps the window to centre on that point first.
    const insideWindow = pointerMs >= startMs && pointerMs <= startMs + windowMs;
    let anchorMs = insideWindow ? pointerMs - startMs : windowMs / 2;
    if (!insideWindow) onChange(clamp(pointerMs - anchorMs, 0, maxStart));
    setDragging(true);

    function move(ev: PointerEvent) {
      const ms = (ev.clientX - rect.left) * msPerPx;
      onChange(Math.round(clamp(ms - anchorMs, 0, maxStart) / 250) * 250);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      anchorMs = 0;
      setDragging(false);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  return (
    <div>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className={`relative h-16 touch-none select-none ${maxStart === 0 ? "" : "cursor-grab"}`}
      >
        {peaks === null ? (
          <div className="animate-skeleton absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 rounded-full bg-white/10" />
        ) : peaks.length === 0 ? (
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15" />
        ) : (
          <svg
            viewBox={`0 0 ${peaks.length * 3} 64`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            {peaks.map((p, i) => {
              const h = Math.max(3, p * 56);
              const center = ((i + 0.5) / peaks.length) * 100;
              const inside = center >= startPct && center <= endPct;
              return (
                <rect
                  key={i}
                  x={i * 3 + 0.5}
                  y={(64 - h) / 2}
                  width={2}
                  height={h}
                  rx={1}
                  fill={inside ? "#ffffff" : "rgb(255 255 255 / 0.22)"}
                />
              );
            })}
          </svg>
        )}
        <div
          className={`pointer-events-none absolute inset-y-0 rounded-[12px] border-[2.5px] border-white transition-shadow duration-150 ${
            dragging ? "bg-white/[0.06] shadow-[0_0_0_4px_rgb(255_255_255/0.12)]" : "bg-white/[0.03]"
          }`}
          style={{ left: `${startPct}%`, width: `${windowPct}%` }}
        />
        {getPlaybackMs && (
          <span
            ref={playheadRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-1 w-[2px] -translate-x-1/2 rounded-full bg-accent opacity-0"
          />
        )}
      </div>
      <div className="mt-2 tabular-nums flex items-center justify-between text-[0.75rem] text-white/50">
        <span className="font-semibold text-white">{formatClock(startMs)}</span>
        <span>
          {maxStart === 0 ? "Plays from the start" : `Drag to choose · ${Math.round(windowMs / 1000)}s`}
        </span>
        <span>{formatClock(durationMs)}</span>
      </div>
    </div>
  );
}
