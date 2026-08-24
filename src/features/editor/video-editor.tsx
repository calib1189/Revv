"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { drawFrame } from "@/features/editor/draw-frame";
import { useVideoExport } from "@/features/editor/use-video-export";
import { TrimScrubber } from "@/features/editor/trim-scrubber";
import { FILTER_PRESETS } from "@/features/editor/filters";
import { aspectNeedsPan } from "@/features/editor/crop";
import {
  DEFAULT_EDIT_STATE,
  TEXT_FONTS,
  type EditState,
  type AspectRatioId,
  type TextLayer,
} from "@/features/editor/types";
import {
  BackIcon,
  CheckIcon,
  ScissorsIcon,
  CropIcon,
  TextToolIcon,
  MusicIcon,
  FilterIcon,
  TrashIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

type Tool = "trim" | "crop" | "filter" | "text" | "music" | null;

const ASPECTS: { id: AspectRatioId; label: string }[] = [
  { id: "9:16", label: "9:16" },
  { id: "4:5", label: "4:5" },
  { id: "1:1", label: "1:1" },
  { id: "original", label: "Original" },
];

const TEXT_COLORS = ["#ffffff", "#ff4433", "#ffd166", "#06d6a0", "#4cc9f0", "#000000"];

const TOOLS: { id: Exclude<Tool, null>; label: string; icon: typeof ScissorsIcon }[] = [
  { id: "trim", label: "Trim", icon: ScissorsIcon },
  { id: "crop", label: "Crop", icon: CropIcon },
  { id: "filter", label: "Filters", icon: FilterIcon },
  { id: "text", label: "Text", icon: TextToolIcon },
  { id: "music", label: "Music", icon: MusicIcon },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function VideoEditor({
  source,
  onCancel,
  onExported,
}: {
  source: File;
  onCancel: () => void;
  onExported: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const sourceUrl = useMemo(() => URL.createObjectURL(source), [source]);
  const musicUrl = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [videoDims, setVideoDims] = useState({ width: 0, height: 0 });
  const [duration, setDuration] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 9, height: 16 });
  const [tool, setTool] = useState<Tool>(null);
  const [state, setState] = useState<EditState>({
    ...DEFAULT_EDIT_STATE,
    trimStart: 0,
    trimEnd: 0,
  });
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [newTextDraft, setNewTextDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const { exportVideo, isExporting, progress } = useVideoExport();

  useEffect(() => {
    return () => URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  // Load source metadata once the hidden decode <video> is ready. Clips
  // recorded via MediaRecorder (both in-app recording and, per repeated
  // real-world reports, some phones' own camera exports) commonly come
  // back with an unusable duration (Infinity, NaN, or just missing) since
  // the container's duration field is written lazily — the fix browsers
  // themselves recommend is forcing a seek near the end, which makes the
  // engine rescan and fill in the real value, then seeking back to 0.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function finish(el: HTMLVideoElement) {
      const d = el.duration;
      setVideoDims({ width: el.videoWidth, height: el.videoHeight });
      setDuration(d);
      setState((s) => ({ ...s, trimStart: 0, trimEnd: Math.min(d, 60) }));
      setReady(true);
    }

    function onLoaded() {
      const el = video!;
      if (Number.isFinite(el.duration) && el.duration > 0) {
        finish(el);
        return;
      }
      const onFixed = () => {
        el.removeEventListener("durationchange", onFixed);
        el.currentTime = 0;
        finish(el);
      };
      el.addEventListener("durationchange", onFixed);
      el.currentTime = 1e10;
    }
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, []);

  // Live edit preview: loops playback within the trim bounds, drawing every
  // frame through the exact same compositor the final export uses.
  //
  // Must stay off while exporting — export plays and seeks this exact
  // <video> element itself to drive its own frame-by-frame capture, and if
  // this loop kept running at the same time it would race the export's
  // own end-of-clip check: this loop's reset-to-trimStart fires every
  // frame once playback reaches trimEnd, so it would win that race almost
  // every time and export's `currentTime >= trimEnd` check would never
  // observe a passing value — the clip would just visibly loop forever
  // and the recording would never stop.
  useEffect(() => {
    if (!ready || isExporting) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    video.currentTime = stateRef.current.trimStart;
    video.volume = stateRef.current.originalVolume;
    video.play().catch(() => {});

    let raf: number;
    function loop() {
      const s = stateRef.current;
      const el = video!;
      if (el.currentTime >= s.trimEnd || el.ended) {
        el.currentTime = s.trimStart;
      }
      el.volume = s.originalVolume;
      drawFrame(ctx!, el, canvas!.width, canvas!.height, s);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      video.pause();
    };
  }, [ready, isExporting]);

  // Preview canvas resolution follows the chosen aspect — modest size for
  // smooth live editing; the export pass renders at full target resolution
  // on its own offscreen canvas, independent of this one.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const MAX = 720;
    let w: number;
    let h: number;
    if (state.aspect === "9:16") {
      w = Math.round((MAX * 9) / 16);
      h = MAX;
    } else if (state.aspect === "1:1") {
      w = MAX;
      h = MAX;
    } else if (state.aspect === "4:5") {
      w = Math.round((MAX * 4) / 5);
      h = MAX;
    } else if (videoDims.width && videoDims.height) {
      const scale = MAX / Math.max(videoDims.width, videoDims.height);
      w = Math.round(videoDims.width * scale);
      h = Math.round(videoDims.height * scale);
    } else {
      w = Math.round((MAX * 9) / 16);
      h = MAX;
    }
    canvas.width = w;
    canvas.height = h;
    setCanvasSize({ width: w, height: h });
  }, [state.aspect, videoDims]);

  // Music preview: a plain <audio> element loop, independent of the more
  // precise Web Audio graph the export pass builds — close enough for
  // editing, and far simpler than duplicating that graph just to preview.
  useEffect(() => {
    if (musicUrl.current) URL.revokeObjectURL(musicUrl.current);
    if (!state.musicFile) {
      musicUrl.current = null;
      if (musicAudioRef.current) musicAudioRef.current.src = "";
      return;
    }
    const url = URL.createObjectURL(state.musicFile);
    musicUrl.current = url;
    if (musicAudioRef.current) {
      musicAudioRef.current.src = url;
      musicAudioRef.current.loop = true;
      musicAudioRef.current.play().catch(() => {});
    }
    return () => URL.revokeObjectURL(url);
  }, [state.musicFile]);

  useEffect(() => {
    if (musicAudioRef.current) musicAudioRef.current.volume = state.musicVolume;
  }, [state.musicVolume]);

  function updateState(patch: Partial<EditState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function addTextLayer() {
    if (!newTextDraft.trim()) return;
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      text: newTextDraft.trim().slice(0, 80),
      x: 0.5,
      y: 0.5,
      color: "#ffffff",
      fontSize: 64,
      fontId: "sans",
    };
    setState((s) => ({ ...s, textLayers: [...s.textLayers, layer] }));
    setNewTextDraft("");
    setSelectedTextId(layer.id);
  }

  function updateTextLayer(id: string, patch: Partial<TextLayer>) {
    setState((s) => ({
      ...s,
      textLayers: s.textLayers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }

  function removeTextLayer(id: string) {
    setState((s) => ({ ...s, textLayers: s.textLayers.filter((l) => l.id !== id) }));
    if (selectedTextId === id) setSelectedTextId(null);
  }

  function handlePreviewPointerDown(e: React.PointerEvent) {
    const container = previewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dragTextId = selectedTextId;
    const cropPanEnabled =
      tool === "crop" && aspectNeedsPan(state.aspect, videoDims.width, videoDims.height);
    if (!dragTextId && !cropPanEnabled) return;

    e.preventDefault();
    const videoAspect = videoDims.width / Math.max(1, videoDims.height);
    const targetAspect =
      state.aspect === "9:16"
        ? 9 / 16
        : state.aspect === "1:1"
          ? 1
          : state.aspect === "4:5"
            ? 4 / 5
            : videoAspect;
    const panAxisIsX = videoAspect > targetAspect;

    function move(ev: PointerEvent) {
      const fracX = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      const fracY = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
      if (dragTextId) {
        updateTextLayer(dragTextId, { x: fracX, y: fracY });
      } else if (cropPanEnabled) {
        updateState({ panOffset: panAxisIsX ? fracX : fracY });
      }
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  async function handleDone() {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    try {
      const { blob, extension } = await exportVideo(video, state);
      const file = new File([blob], `revv-clip.${extension}`, { type: blob.type });
      onExported(file);
    } catch {
      setError("Couldn't finish editing that video. Try again.");
    }
  }

  const selectedLayer = state.textLayers.find((l) => l.id === selectedTextId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* No `loop` attribute: the edit preview effect below already resets
          currentTime itself once playback reaches trimEnd. The native
          attribute doing the exact same thing independently is what
          actually broke export — trimEnd equals the clip's true end for
          any clip under 60s, so the browser's own auto-restart-on-end
          fired ahead of export's own "did we reach trimEnd" check, which
          could never observe the clip finishing. */}
      {/* Real (if off-screen) size on purpose, not `sr-only` — `sr-only`
          clips an element to 0 visible pixels (clip: rect(0,0,0,0)), and
          WebKit/iOS Safari is known to throttle or fully stall video
          decoding for a <video> with effectively zero visible area. That's
          the likely reason export could still hang short of the finish
          line on an actual iPhone even after the two fixes above: currentTime
          would creep up and stall just under trimEnd because playback
          itself stalled, not because of a loop race. Positioning off-
          screen with a real, unclipped size keeps decoding fully live
          while staying invisible to the user. */}
      <video ref={videoRef} src={sourceUrl} playsInline className="fixed left-[-9999px] top-0 h-40 w-40" />

      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleDone}
          disabled={!ready || isExporting}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {isExporting ? (
            progress >= 1 ? "Finishing up…" : `Exporting ${Math.round(progress * 100)}%`
          ) : (
            <>
              <CheckIcon className="h-4 w-4" />
              Done
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="px-4 pt-3">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-3">
        <div
          ref={previewRef}
          onPointerDown={handlePreviewPointerDown}
          className="relative max-h-full max-w-full touch-none overflow-hidden rounded-2xl bg-black shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)]"
          style={{ aspectRatio: `${canvasSize.width} / ${canvasSize.height}` }}
        >
          <canvas ref={canvasRef} className="h-full w-full" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/60">
              Loading…
            </div>
          )}
          {tool === "text" &&
            state.textLayers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTextId(layer.id);
                }}
                className={`absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${
                  selectedTextId === layer.id ? "border-accent" : "border-transparent"
                }`}
                style={{ left: `${layer.x * 100}%`, top: `${layer.y * 100}%` }}
                aria-label={`Select "${layer.text}"`}
              />
            ))}
        </div>
      </div>

      <audio ref={musicAudioRef} className="hidden" />

      <div className="flex-shrink-0 border-t border-white/10 bg-[#0a0a0b] pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {tool === "trim" && (
          <TrimScrubber
            duration={duration}
            trimStart={state.trimStart}
            trimEnd={state.trimEnd}
            onChange={(trimStart, trimEnd) => updateState({ trimStart, trimEnd })}
          />
        )}

        {tool === "crop" && (
          <div className="flex items-center justify-center gap-2 py-4">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => updateState({ aspect: a.id, panOffset: 0.5 })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  state.aspect === a.id
                    ? "bg-accent text-accent-foreground"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {tool === "filter" && (
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 py-4">
            {FILTER_PRESETS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => updateState({ filterId: f.id })}
                className="flex flex-shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={`h-14 w-14 rounded-xl bg-gradient-to-br from-zinc-500 to-zinc-800 ${
                    state.filterId === f.id ? "ring-2 ring-accent ring-offset-2 ring-offset-black" : ""
                  }`}
                  style={{ filter: f.previewCss }}
                />
                <span className="text-xs text-white/80">{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {tool === "text" && (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex gap-2">
              <input
                value={newTextDraft}
                onChange={(e) => setNewTextDraft(e.target.value)}
                placeholder="Add text…"
                maxLength={80}
                className="glass-inset min-w-0 flex-1 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/40"
              />
              <button
                type="button"
                onClick={addTextLayer}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
                aria-label="Add text layer"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>

            {selectedLayer && (
              <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateTextLayer(selectedLayer.id, { color: c })}
                        className={`h-6 w-6 rounded-full border-2 ${
                          selectedLayer.color === c ? "border-accent" : "border-white/20"
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Text color ${c}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTextLayer(selectedLayer.id)}
                    aria-label="Delete text"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/60">Size</span>
                  <input
                    type="range"
                    min={24}
                    max={160}
                    step={2}
                    value={selectedLayer.fontSize}
                    onChange={(e) =>
                      updateTextLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
                    }
                    className="flex-1"
                  />
                </div>

                <div className="no-scrollbar flex gap-2 overflow-x-auto">
                  {TEXT_FONTS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateTextLayer(selectedLayer.id, { fontId: f.id })}
                      style={{ fontFamily: f.stack }}
                      className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm ${
                        selectedLayer.fontId === f.id
                          ? "bg-accent text-accent-foreground"
                          : "bg-white/10 text-white/80"
                      }`}
                    >
                      Aa
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!selectedLayer && state.textLayers.length > 0 && (
              <p className="text-center text-xs text-muted">
                Tap a dot on the preview to drag or restyle it.
              </p>
            )}
          </div>
        )}

        {tool === "music" && (
          <div className="flex flex-col gap-4 px-4 py-4">
            <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-4 text-sm font-medium text-white/80">
              <MusicIcon className="h-4 w-4" />
              {state.musicFile ? state.musicFile.name : "Choose audio from your device"}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) updateState({ musicFile: file });
                  e.target.value = "";
                }}
              />
            </label>
            {state.musicFile && (
              <>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="w-20 flex-shrink-0">Music</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.musicVolume}
                    onChange={(e) => updateState({ musicVolume: Number(e.target.value) })}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="w-20 flex-shrink-0">Original</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.originalVolume}
                    onChange={(e) => updateState({ originalVolume: Number(e.target.value) })}
                    className="flex-1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => updateState({ musicFile: null })}
                  className="self-start text-xs text-muted hover:text-danger"
                >
                  Remove music
                </button>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-around px-2 py-2">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool((t) => (t === id ? null : id))}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 ${
                tool === id ? "text-accent" : "text-white/70"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[0.65rem] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
