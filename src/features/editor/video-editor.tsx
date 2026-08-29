"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { drawFrame } from "@/features/editor/draw-frame";
import { useVideoExport } from "@/features/editor/use-video-export";
import { compressVideo } from "@/features/editor/compress-video";
import { TrimScrubber } from "@/features/editor/trim-scrubber";
import { FILTER_PRESETS } from "@/features/editor/filters";
import { aspectNeedsPan } from "@/features/editor/crop";
import { STICKER_EMOJIS } from "@/features/editor/stickers";
import { pickAudioRecorderMimeType } from "@/features/editor/audio-recording";
import { MAX_VIDEO_BYTES } from "@/lib/validation/media";
import {
  DEFAULT_EDIT_STATE,
  TEXT_FONTS,
  SPEED_PRESETS,
  type EditState,
  type AspectRatioId,
  type Rotation,
  type TextLayer,
  type DrawStroke,
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
  BrushIcon,
  SpeedIcon,
  StickerIcon,
  RotateIcon,
  MicIcon,
} from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

type Tool = "trim" | "crop" | "filter" | "text" | "sticker" | "draw" | "speed" | "music" | "voice" | null;

const ROTATION_STEPS: Rotation[] = [0, 90, 180, 270];

const ASPECTS: { id: AspectRatioId; label: string }[] = [
  { id: "9:16", label: "9:16" },
  { id: "4:5", label: "4:5" },
  { id: "1:1", label: "1:1" },
  { id: "original", label: "Original" },
];

const TEXT_COLORS = ["#ffffff", "#ff4433", "#ffd166", "#06d6a0", "#4cc9f0", "#000000"];
const DRAW_WIDTHS = [6, 12, 22];

const TOOLS: { id: Exclude<Tool, null>; label: string; icon: typeof ScissorsIcon }[] = [
  { id: "trim", label: "Trim", icon: ScissorsIcon },
  { id: "crop", label: "Crop", icon: CropIcon },
  { id: "speed", label: "Speed", icon: SpeedIcon },
  { id: "filter", label: "Filters", icon: FilterIcon },
  { id: "text", label: "Text", icon: TextToolIcon },
  { id: "sticker", label: "Stickers", icon: StickerIcon },
  { id: "draw", label: "Draw", icon: BrushIcon },
  { id: "voice", label: "Voice", icon: MicIcon },
  { id: "music", label: "Music", icon: MusicIcon },
];

const MAX_VOICEOVER_SECONDS = 180;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Re-points an already-mounted <video> element at a new source and
 * waits for its metadata to actually be ready, rather than assuming the
 * assignment takes effect synchronously. Used to swap the live preview
 * element onto a freshly-compressed file before re-encoding — exportVideo
 * drives its own frame capture by playing/seeking this exact element, so
 * it would otherwise still decode the original oversized source even
 * though a smaller file was produced, regardless of which File object
 * gets passed as exportVideo's own separate `source` argument (that one
 * is only used for audio extraction, never the visual frames). */
function loadVideoSource(video: HTMLVideoElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
      reject(new Error("Could not load the compressed video."));
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.src = url;
  });
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
  const [drawColor, setDrawColor] = useState(TEXT_COLORS[1]);
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1]);
  const [error, setError] = useState<string | null>(null);
  const [compressionStage, setCompressionStage] = useState<"idle" | "loading" | "compressing">("idle");
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isRecordingVoiceover, setIsRecordingVoiceover] = useState(false);
  const voiceoverAudioRef = useRef<HTMLAudioElement>(null);
  const voiceoverUrl = useRef<string | null>(null);
  const voiceoverRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceoverStreamRef = useRef<MediaStream | null>(null);
  const voiceoverChunksRef = useRef<BlobPart[]>([]);
  const voiceoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  // Snapshot of the state right after real metadata loads (before any
  // possible user interaction) — lets handleDone tell "genuinely
  // unedited" apart from "edited, then undone back to the same values"
  // by comparison instead of tracking every single mutation path
  // individually (there are several: updateState, addTextLayer,
  // addDrawStroke, etc.), which would be easy to under-track.
  const baselineStateRef = useRef<EditState | null>(null);

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
      setState((s) => {
        const next = { ...s, trimStart: 0, trimEnd: Math.min(d, 60) };
        baselineStateRef.current = next;
        return next;
      });
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
      el.playbackRate = s.playbackRate;
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

  // Voiceover preview: same plain-<audio>-loop pattern as music above, so
  // a recorded narration can be played back once for a sanity check —
  // not looped, matching how it's actually mixed in export (start(0), no
  // loop, since it's meant to run once alongside the clip, not repeat).
  useEffect(() => {
    if (voiceoverUrl.current) URL.revokeObjectURL(voiceoverUrl.current);
    if (!state.voiceoverFile) {
      voiceoverUrl.current = null;
      if (voiceoverAudioRef.current) voiceoverAudioRef.current.src = "";
      return;
    }
    const url = URL.createObjectURL(state.voiceoverFile);
    voiceoverUrl.current = url;
    if (voiceoverAudioRef.current) voiceoverAudioRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [state.voiceoverFile]);

  useEffect(() => {
    if (voiceoverAudioRef.current) voiceoverAudioRef.current.volume = state.voiceoverVolume;
  }, [state.voiceoverVolume]);

  // Stop any in-flight recording and release the mic if the editor is
  // torn down mid-recording (user backs out while recording).
  useEffect(() => {
    return () => {
      if (voiceoverTimeoutRef.current) clearTimeout(voiceoverTimeoutRef.current);
      voiceoverRecorderRef.current?.stop();
      voiceoverStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function updateState(patch: Partial<EditState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function rotateClockwise() {
    setState((s) => {
      const currentIndex = ROTATION_STEPS.indexOf(s.rotation);
      const next = ROTATION_STEPS[(currentIndex + 1) % ROTATION_STEPS.length];
      return { ...s, rotation: next };
    });
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
      isSticker: false,
    };
    setState((s) => ({ ...s, textLayers: [...s.textLayers, layer] }));
    setNewTextDraft("");
    setSelectedTextId(layer.id);
  }

  function addStickerLayer(emoji: string) {
    const layer: TextLayer = {
      id: crypto.randomUUID(),
      text: emoji,
      x: 0.5,
      y: 0.5,
      color: "#ffffff",
      fontSize: 110,
      fontId: "sans",
      isSticker: true,
    };
    setState((s) => ({ ...s, textLayers: [...s.textLayers, layer] }));
    setSelectedTextId(layer.id);
  }

  async function startVoiceoverRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceoverStreamRef.current = stream;
      const { mimeType, extension } = pickAudioRecorderMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      voiceoverChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) voiceoverChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(voiceoverChunksRef.current, { type: mimeType.split(";")[0] });
        if (blob.size > 0) {
          const file = new File([blob], `voiceover.${extension}`, { type: blob.type });
          updateState({ voiceoverFile: file });
        }
        stream.getTracks().forEach((t) => t.stop());
        voiceoverStreamRef.current = null;
      };
      voiceoverRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoiceover(true);
      // A stray tap-and-forget shouldn't record indefinitely — cap it the
      // same as a posted clip's own max length.
      voiceoverTimeoutRef.current = setTimeout(() => {
        stopVoiceoverRecording();
      }, MAX_VOICEOVER_SECONDS * 1000);
    } catch {
      setError("Couldn't access the microphone. Check your browser/app permissions.");
    }
  }

  function stopVoiceoverRecording() {
    if (voiceoverTimeoutRef.current) {
      clearTimeout(voiceoverTimeoutRef.current);
      voiceoverTimeoutRef.current = null;
    }
    voiceoverRecorderRef.current?.stop();
    setIsRecordingVoiceover(false);
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

  function addDrawStroke(strokeId: string, fracX: number, fracY: number) {
    setState((s) => {
      const point = { x: fracX, y: fracY };
      const existing = s.drawStrokes.find((st) => st.id === strokeId);
      const drawStrokes: DrawStroke[] = existing
        ? s.drawStrokes.map((st) =>
            st.id === strokeId ? { ...st, points: [...st.points, point] } : st,
          )
        : [...s.drawStrokes, { id: strokeId, color: drawColor, width: drawWidth, points: [point] }];
      return { ...s, drawStrokes };
    });
  }

  function undoDrawStroke() {
    setState((s) => ({ ...s, drawStrokes: s.drawStrokes.slice(0, -1) }));
  }

  function clearDrawStrokes() {
    setState((s) => ({ ...s, drawStrokes: [] }));
  }

  function handlePreviewPointerDown(e: React.PointerEvent) {
    const container = previewRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (tool === "draw") {
      e.preventDefault();
      const strokeId = crypto.randomUUID();
      const point = (ev: { clientX: number; clientY: number }) => ({
        x: clamp((ev.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((ev.clientY - rect.top) / rect.height, 0, 1),
      });
      const first = point(e);
      addDrawStroke(strokeId, first.x, first.y);
      function move(ev: PointerEvent) {
        const p = point(ev);
        addDrawStroke(strokeId, p.x, p.y);
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      return;
    }

    // Gated on the active tool, not just whether a text layer happens to
    // be selected — otherwise switching to another tool (crop, say) while
    // a text layer was still selected would keep dragging that text
    // instead of doing whatever the newly-selected tool is for.
    const dragTextId = tool === "text" || tool === "sticker" ? selectedTextId : null;
    const cropPanEnabled =
      tool === "crop" && aspectNeedsPan(state.aspect, videoDims.width, videoDims.height, state.rotation);
    if (!dragTextId && !cropPanEnabled) return;

    e.preventDefault();
    const videoAspect = videoDims.width / Math.max(1, videoDims.height);
    const rawTargetAspect =
      state.aspect === "9:16"
        ? 9 / 16
        : state.aspect === "1:1"
          ? 1
          : state.aspect === "4:5"
            ? 4 / 5
            : videoAspect;
    const targetAspect =
      state.rotation === 90 || state.rotation === 270 ? 1 / rawTargetAspect : rawTargetAspect;
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

    // Nothing was actually changed from the freshly-loaded baseline —
    // no trim, no crop/aspect change, no filter, no text, no drawing, no
    // music, no speed/volume change. There's no real reason to re-encode
    // through the canvas-capture + MediaRecorder pipeline for a no-op,
    // and that pipeline has shown real device-specific reliability
    // issues (see use-video-export.ts's recorder.onerror handling) that
    // a pure pass-through of the original file has zero exposure to.
    const baseline = baselineStateRef.current;
    const isUnedited =
      baseline !== null &&
      state.trimStart === baseline.trimStart &&
      state.trimEnd === baseline.trimEnd &&
      state.aspect === baseline.aspect &&
      state.panOffset === baseline.panOffset &&
      state.rotation === baseline.rotation &&
      state.filterId === baseline.filterId &&
      state.textLayers.length === 0 &&
      state.drawStrokes.length === 0 &&
      state.musicFile === null &&
      state.musicVolume === baseline.musicVolume &&
      state.originalVolume === baseline.originalVolume &&
      state.voiceoverFile === null &&
      state.voiceoverVolume === baseline.voiceoverVolume &&
      state.playbackRate === baseline.playbackRate;
    // A pure pass-through only actually works if the raw source already
    // fits within the app's own size limit — a high-resolution/high-fps
    // recording (4K, 120fps) can easily be several times larger than
    // that even for a short clip, and passthrough can't shrink it.
    // Re-encoding is the only way to get an oversized source down to a
    // postable size regardless of whether anything was "edited" — the
    // export pipeline already downscales to a fixed ~720p target
    // (exportCanvasSize in use-video-export.ts) independent of the
    // source's resolution, so this is expected to succeed even when the
    // pass-through can't.
    if (isUnedited && source.size <= MAX_VIDEO_BYTES) {
      onExported(source);
      return;
    }

    // Re-encoding an oversized source through the canvas-capture +
    // MediaRecorder pipeline has failed outright on at least one real
    // device (a clean recorder stop with zero captured data) — that
    // pipeline has to decode the full source resolution every single
    // frame in real time regardless of the output size, and decoding
    // 4K/120fps live is a genuine hardware ceiling on a lot of phones,
    // not a bug with a code fix. ffmpeg.wasm does the same compression
    // job as offline software transcoding instead — slower, but with no
    // dependency on the browser's own real-time streaming/recording
    // APIs at all, so it can't hit that specific failure mode.
    let effectiveSource = source;
    if (source.size > MAX_VIDEO_BYTES) {
      setCompressionStage("loading");
      setCompressionProgress(0);
      try {
        effectiveSource = await compressVideo(source, {
          onLoadProgress: () => setCompressionStage("compressing"),
          onCompressProgress: (ratio) => setCompressionProgress(ratio),
        });
      } catch (err) {
        setCompressionStage("idle");
        const detail = err instanceof Error ? err.message : String(err);
        setError(
          `Couldn't compress that video for posting. (${detail}) Try recording at 720p or 1080p instead of 4K/120fps.`,
        );
        return;
      }
      setCompressionStage("idle");

      if (isUnedited) {
        onExported(effectiveSource);
        return;
      }

      // Real edits were applied — re-point the live preview element at
      // the now-normal-sized compressed file before re-encoding, so the
      // trim/filter export pass decodes the small compressed video
      // instead of the original oversized source (exportVideo's own
      // `source` argument only feeds audio extraction, not the frame
      // capture, which is driven entirely by this element).
      try {
        await loadVideoSource(video, URL.createObjectURL(effectiveSource));
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        setError(`Couldn't finish editing that video. (${detail})`);
        return;
      }
    }

    try {
      const { blob, extension } = await exportVideo(video, effectiveSource, state);
      const file = new File([blob], `revv-clip.${extension}`, { type: blob.type });
      onExported(file);
    } catch (err) {
      // Surfaces the real underlying reason (a MediaRecorder construction
      // failure, a codec issue, decodeAudioData rejecting) instead of one
      // generic string that gives no way to tell what actually happened
      // on a given device.
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Couldn't finish editing that video. (${detail})`);
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
          disabled={!ready || isExporting || compressionStage !== "idle"}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {compressionStage === "loading" ? (
            "Preparing compressor…"
          ) : compressionStage === "compressing" ? (
            `Compressing ${Math.round(compressionProgress * 100)}%`
          ) : isExporting ? (
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
          {(tool === "text" || tool === "sticker") &&
            state.textLayers
              .filter((l) => l.isSticker === (tool === "sticker"))
              .map((layer) => (
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
      <audio ref={voiceoverAudioRef} className="hidden" />

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
            <button
              type="button"
              onClick={rotateClockwise}
              aria-label="Rotate 90 degrees"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80"
            >
              <RotateIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {tool === "speed" && (
          <div className="flex items-center justify-center gap-2 py-4">
            {SPEED_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => updateState({ playbackRate: p.value })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  state.playbackRate === p.value
                    ? "bg-accent text-accent-foreground"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {p.label}
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

            {selectedLayer && !selectedLayer.isSticker && (
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
            {!selectedLayer && state.textLayers.filter((l) => !l.isSticker).length > 0 && (
              <p className="text-center text-xs text-muted">
                Tap a dot on the preview to drag or restyle it.
              </p>
            )}
          </div>
        )}

        {tool === "sticker" && (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="no-scrollbar grid grid-cols-8 gap-2 overflow-x-auto">
              {STICKER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addStickerLayer(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl"
                  aria-label={`Add ${emoji} sticker`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {selectedLayer && selectedLayer.isSticker && (
              <div className="flex flex-col gap-3 rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-white/60">Selected: {selectedLayer.text}</span>
                  <button
                    type="button"
                    onClick={() => removeTextLayer(selectedLayer.id)}
                    aria-label="Delete sticker"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/60">Size</span>
                  <input
                    type="range"
                    min={40}
                    max={220}
                    step={4}
                    value={selectedLayer.fontSize}
                    onChange={(e) =>
                      updateTextLayer(selectedLayer.id, { fontSize: Number(e.target.value) })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            )}
            {!selectedLayer && state.textLayers.filter((l) => l.isSticker).length > 0 && (
              <p className="text-center text-xs text-muted">
                Tap a sticker on the preview to drag or resize it.
              </p>
            )}
          </div>
        )}

        {tool === "draw" && (
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDrawColor(c)}
                    className={`h-6 w-6 rounded-full border-2 ${
                      drawColor === c ? "border-accent" : "border-white/20"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Draw color ${c}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undoDrawStroke}
                  disabled={state.drawStrokes.length === 0}
                  className="text-xs text-white/70 disabled:opacity-40"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={clearDrawStrokes}
                  disabled={state.drawStrokes.length === 0}
                  aria-label="Clear drawing"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 disabled:opacity-40"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {DRAW_WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setDrawWidth(w)}
                  aria-label={`Brush size ${w}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    drawWidth === w ? "bg-accent" : "bg-white/10"
                  }`}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: Math.round(w / 2),
                      height: Math.round(w / 2),
                      backgroundColor: drawWidth === w ? "var(--color-accent-foreground)" : "white",
                    }}
                  />
                </button>
              ))}
              <span className="text-xs text-white/50">Draw right on the preview</span>
            </div>
          </div>
        )}

        {tool === "voice" && (
          <div className="flex flex-col gap-4 px-4 py-4">
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={isRecordingVoiceover ? stopVoiceoverRecording : startVoiceoverRecording}
                className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold ${
                  isRecordingVoiceover
                    ? "bg-danger text-white"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                <MicIcon className="h-4 w-4" />
                {isRecordingVoiceover ? "Stop recording" : "Record voiceover"}
              </button>
            </div>
            {isRecordingVoiceover && (
              <p className="text-center text-xs text-white/50">
                Recording — plays back over the clip from the start of your trim.
              </p>
            )}
            {!isRecordingVoiceover && state.voiceoverFile && (
              <>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="w-20 flex-shrink-0">Voiceover</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.voiceoverVolume}
                    onChange={(e) => updateState({ voiceoverVolume: Number(e.target.value) })}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => voiceoverAudioRef.current?.play().catch(() => {})}
                    className="text-xs text-white/70 hover:text-white"
                  >
                    Play back
                  </button>
                  <button
                    type="button"
                    onClick={() => updateState({ voiceoverFile: null })}
                    className="text-xs text-muted hover:text-danger"
                  >
                    Remove voiceover
                  </button>
                </div>
              </>
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
