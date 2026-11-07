"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawFrame } from "@/features/editor/draw-frame";
import { useVideoExport } from "@/features/editor/use-video-export";
import { compressVideo } from "@/features/editor/compress-video";
import { shrinkVideoForFeed } from "@/features/editor/shrink-video";
import { TrimScrubber } from "@/features/editor/trim-scrubber";
import { capturePreviewSource } from "@/features/editor/capture-preview-source";
import { aspectNeedsPan } from "@/features/editor/crop";
import { createAudioContext, pickAudioRecorderMimeType } from "@/features/editor/audio-recording";
import { MAX_VIDEO_BYTES } from "@/lib/validation/media";
import {
  DEFAULT_EDIT_STATE,
  SPEED_PRESETS,
  type EditState,
  type Rotation,
  type TextLayer,
  type DrawStroke,
  type TextFontId,
} from "@/features/editor/types";
import {
  ScissorsIcon,
  CropIcon,
  TextToolIcon,
  MusicIcon,
  FilterIcon,
  TrashIcon,
  BrushIcon,
  SpeedIcon,
  StickerIcon,
  MicIcon,
  CloseIcon,
  PlayIcon,
  ChevronRightIcon,
  VolumeIcon,
} from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";
import {
  StudioHeader,
  StudioAction,
  StudioStage,
  StudioDeck,
  StudioPanel,
  StudioChip,
  StudioIconButton,
  StudioSlider,
  StudioRail,
} from "@/features/editor/studio-ui";
import {
  LayerHandles,
  TextComposer,
  StickerSheet,
  StickerControls,
  CropControls,
  FilterControls,
  DrawControls,
  TEXT_COLORS,
  DRAW_WIDTHS,
} from "@/features/editor/editor-tools";
import { SoundPickerSheet } from "@/features/sounds/sound-picker-sheet";
import { SoundCover } from "@/features/sounds/sound-cover";
import { useWaveformPeaks, WaveformTrimmer } from "@/features/sounds/sound-waveform";
import { fetchSoundFile } from "@/features/sounds/fetch-sound-file";
import type { Sound } from "@/lib/db/sounds";

type Tool = "trim" | "crop" | "filter" | "sticker" | "draw" | "speed" | "music" | "voice" | null;
type RailTool = "text" | "stickers" | "filter" | "draw" | "trim" | "speed" | "crop" | "voice";

const ROTATION_STEPS: Rotation[] = [0, 90, 180, 270];

const TOOL_TITLES: Record<Exclude<Tool, null>, string> = {
  trim: "Trim",
  crop: "Crop",
  filter: "Filters",
  sticker: "Sticker",
  draw: "Draw",
  speed: "Speed",
  music: "Sound",
  voice: "Voiceover",
};

const MAX_VOICEOVER_SECONDS = 180;
/** Matches validateVideoDuration — a clip can be kept whole up to the
 * longest a post may be, rather than silently cut to a shorter default. */
const MAX_CLIP_SECONDS = 180;

/** How long a clip gets to report its metadata before the editor says it
 * can't open it, rather than showing "Loading clip" forever. */
const LOAD_TIMEOUT_MS = 20_000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isAutoplayRefusal(err: unknown): boolean {
  return err instanceof DOMException && err.name === "NotAllowedError";
}

/** What to tell someone whose clip the browser couldn't open. */
function describeLoadError(error: MediaError | null): string {
  if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || error?.code === MediaError.MEDIA_ERR_DECODE) {
    return "This video's format can't be played on this device. Try a different video, or record one here.";
  }
  return "Couldn't open this video. Go back and try choosing it again.";
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
  initialSound = null,
}: {
  source: File;
  onCancel: () => void;
  /** The chosen library sound rides along with the exported file: its
   * audio is already mixed into those bytes, but the post still records
   * which sound it was so it shows up on that sound's own page and in
   * "use this sound". */
  onExported: (file: File, sound: Sound | null, soundStartMs: number) => void;
  initialSound?: Sound | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const musicAudioRef = useRef<HTMLAudioElement>(null);
  const sourceUrl = useMemo(() => URL.createObjectURL(source), [source]);
  const musicUrl = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // True once the browser has refused to play with sound before a tap.
  // The preview then runs muted (a moving picture beats a frozen one) and
  // offers "Tap for sound"; any tap at all in the editor brings it back.
  const [soundBlocked, setSoundBlocked] = useState(false);
  const soundBlockedRef = useRef(false);
  const audioUnlockedRef = useRef(false);
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
  // Open text composer: null when closed, { layerId: null } for a new
  // layer, or the id of the layer being edited.
  const [textComposer, setTextComposer] = useState<{ layerId: string | null } | null>(null);
  const [stickerSheetOpen, setStickerSheetOpen] = useState(false);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [musicDurationMs, setMusicDurationMs] = useState(0);
  const [drawColor, setDrawColor] = useState(TEXT_COLORS[2]);
  const [drawWidth, setDrawWidth] = useState(DRAW_WIDTHS[1]);
  const [filterPreviewSource, setFilterPreviewSource] = useState<ImageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressionStage, setCompressionStage] = useState<"idle" | "loading" | "compressing">("idle");
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [isRecordingVoiceover, setIsRecordingVoiceover] = useState(false);
  // The library sound behind this clip, kept beside EditState rather than
  // inside it: EditState describes the edit (and musicFile already holds
  // the audio being mixed), while this is the catalog row the finished
  // post gets attributed to.
  const [librarySound, setLibrarySound] = useState<Sound | null>(null);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [isLoadingSound, setIsLoadingSound] = useState(false);
  const voiceoverAudioRef = useRef<HTMLAudioElement>(null);
  const voiceoverUrl = useRef<string | null>(null);
  const voiceoverRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceoverStreamRef = useRef<MediaStream | null>(null);
  const voiceoverChunksRef = useRef<BlobPart[]>([]);
  const voiceoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCapturedFilterPreviewRef = useRef(false);

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

  const { exportVideo, isExporting, progress, stage: exportStage } = useVideoExport();
  const isExportingRef = useRef(isExporting);
  useEffect(() => {
    isExportingRef.current = isExporting;
  }, [isExporting]);

  const musicKey = librarySound
    ? `sound:${librarySound.id}`
    : state.musicFile
      ? `file:${state.musicFile.name}:${state.musicFile.size}`
      : null;
  const musicPeaks = useWaveformPeaks(state.musicFile, musicKey);
  const getMusicPlaybackMs = useCallback(() => {
    const audio = musicAudioRef.current;
    return audio && !audio.paused && Number.isFinite(audio.currentTime) ? audio.currentTime * 1000 : null;
  }, []);
  const getPreviewTime = useCallback(() => videoRef.current?.currentTime ?? 0, []);

  // A track picked off the device has no catalog duration, so it is read
  // from the preview element once its metadata arrives.
  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    function onMetadata() {
      if (audio && Number.isFinite(audio.duration)) setMusicDurationMs(Math.round(audio.duration * 1000));
    }
    audio.addEventListener("loadedmetadata", onMetadata);
    return () => audio.removeEventListener("loadedmetadata", onMetadata);
  }, []);

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
    let settled = false;

    function finish(el: HTMLVideoElement) {
      if (settled) return;
      settled = true;
      const d = el.duration;
      setVideoDims({ width: el.videoWidth, height: el.videoHeight });
      setDuration(d);
      setState((s) => {
        const next = { ...s, trimStart: 0, trimEnd: Math.min(d, MAX_CLIP_SECONDS) };
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

    // A clip the browser can't decode (an unsupported codec, a damaged
    // file) never reports metadata at all — this, or the timeout below,
    // is what turns that into a message instead of an endless spinner.
    function onError() {
      if (settled) return;
      settled = true;
      setLoadError(describeLoadError(video!.error));
    }

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
    // A small file can finish loading before this effect gets to attach
    // its listener, and then loadedmetadata has already come and gone —
    // the editor used to sit on "Loading clip" forever when that happened.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onLoaded();
    else if (video.error) onError();
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      setLoadError(describeLoadError(video.error));
    }, LOAD_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };
  }, []);

  /** Gives the editor its sound back, from inside a tap — the only place a
   * browser that refused audible playback will allow it. Each media
   * element is also played once here (and paused straight away if it has
   * nothing to play yet): WebKit lets an element play later, unprompted,
   * once it has been played from a tap, which is what a sound picked a
   * moment from now (after its download) needs. */
  const unlockAudio = useCallback(() => {
    if (audioUnlockedRef.current && !soundBlockedRef.current) return;
    audioUnlockedRef.current = true;
    soundBlockedRef.current = false;
    setSoundBlocked(false);

    const s = stateRef.current;
    const video = videoRef.current;
    // Mid-save the export owns the element (muted, its own playback).
    if (video && !isExportingRef.current) {
      video.muted = s.originalVolume === 0;
      // Played even when it's already running muted: that play() from a
      // tap is what lets the preview restart with sound by itself later
      // (it restarts after every save attempt).
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) video.play().catch(() => {});
    }
    const music = musicAudioRef.current;
    if (music) {
      music.play().catch(() => {});
      if (!s.musicFile) music.pause();
    }
    const voiceover = voiceoverAudioRef.current;
    if (voiceover) {
      voiceover.play().catch(() => {});
      voiceover.pause();
    }
  }, []);

  const markSoundBlocked = useCallback(() => {
    soundBlockedRef.current = true;
    setSoundBlocked(true);
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
    // iOS ignores volume set from script (it always plays at 1), so 0% is
    // done with `muted` as well — otherwise "Original sound" at 0% still
    // played the clip's audio under an added sound.
    video.muted = soundBlockedRef.current || stateRef.current.originalVolume === 0;
    video.volume = stateRef.current.originalVolume;
    video.play().catch((err: unknown) => {
      // Refused because there's been no tap to allow sound yet. Playing
      // muted instead keeps the picture moving — refused outright, the
      // canvas had no decoded frame to draw and the preview sat blank.
      if (!isAutoplayRefusal(err) || video.muted) return;
      markSoundBlocked();
      video.muted = true;
      video.play().catch(() => {});
    });

    let raf: number;
    function loop() {
      const s = stateRef.current;
      const el = video!;
      if (el.currentTime >= s.trimEnd || el.ended) {
        el.currentTime = s.trimStart;
      }
      el.muted = soundBlockedRef.current || s.originalVolume === 0;
      el.volume = s.originalVolume;
      el.playbackRate = s.playbackRate;
      drawFrame(ctx!, el, canvas!.width, canvas!.height, s);
      // Captured once, from this canvas's first real drawn frame rather
      // than directly from the <video> element — see
      // capture-preview-source.ts for why that distinction matters.
      // filterId is still "original" this early, so what's captured is
      // guaranteed to be the unfiltered frame every swatch previews
      // against, not whatever filter happens to already be selected.
      //
      // Gated on readyState, not just "has drawFrame run yet" — the very
      // first rAF tick(s) after calling video.play() commonly run before
      // the video has actually decoded any frame at all, so drawFrame's
      // drawImage silently paints nothing and a capture right then would
      // lock in a blank frame forever (the ref guard only allows one
      // attempt). HAVE_CURRENT_DATA is the first readyState where the
      // element is guaranteed to actually have a decoded frame to have
      // just painted.
      if (!hasCapturedFilterPreviewRef.current && el.readyState >= el.HAVE_CURRENT_DATA) {
        hasCapturedFilterPreviewRef.current = true;
        setFilterPreviewSource(capturePreviewSource(canvas!));
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      video.pause();
    };
  }, [ready, isExporting, markSoundBlocked]);

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
    if (!state.musicFile) {
      musicUrl.current = null;
      if (musicAudioRef.current) musicAudioRef.current.src = "";
      return;
    }
    const url = URL.createObjectURL(state.musicFile);
    musicUrl.current = url;
    const audio = musicAudioRef.current;
    if (audio) {
      audio.src = url;
      audio.loop = true;
      // A library sound only arrives after its download, well after the
      // tap that picked it, so this can be refused for lack of one. That
      // used to fail silently — the sound was "added" but never heard.
      audio.play().catch((err: unknown) => {
        if (isAutoplayRefusal(err)) markSoundBlocked();
      });
    }
    // Revoked only here, on the way out. Revoking at the top of the
    // effect body as well used to double-revoke the exact same URL on
    // every change, since React runs this cleanup first.
    return () => {
      URL.revokeObjectURL(url);
      if (musicUrl.current === url) musicUrl.current = null;
    };
  }, [state.musicFile, markSoundBlocked]);

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    audio.volume = state.musicVolume;
    // Same iOS volume caveat as the clip's own sound above.
    audio.muted = state.musicVolume === 0;
  }, [state.musicVolume]);

  // Keeps the preview on the part of the track that will actually be
  // mixed in. The plain <audio> element loops the whole file, so it needs
  // hauling back to the chosen start each time it runs past the end of
  // the window the clip is long enough to use.
  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio || !state.musicFile) return;
    const startSeconds = state.musicStartMs / 1000;

    function seekToStart() {
      if (audio && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(startSeconds, audio.duration);
      }
    }
    function onTimeUpdate() {
      if (!audio) return;
      if (audio.currentTime < startSeconds - 0.25) seekToStart();
    }
    seekToStart();
    audio.addEventListener("loadedmetadata", seekToStart);
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      audio.removeEventListener("loadedmetadata", seekToStart);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [state.musicStartMs, state.musicFile]);

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
    const audio = voiceoverAudioRef.current;
    if (!audio) return;
    audio.volume = state.voiceoverVolume;
    audio.muted = state.voiceoverVolume === 0;
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

  /** Attaching a library sound downloads it and treats it exactly like a
   * track picked off the device — same mixer, same export path — so what
   * the audience hears is baked into the clip's own audio rather than
   * depending on a second player that video posts never had. The clip's
   * own audio ducks to silent, matching what picking a song in any other
   * short-video app does; the Original slider brings it back. */
  async function chooseLibrarySound(sound: Sound) {
    setSoundPickerOpen(false);
    setIsLoadingSound(true);
    setError(null);
    try {
      const file = await fetchSoundFile(sound);
      setLibrarySound(sound);
      updateState({ musicFile: file, musicStartMs: 0, originalVolume: 0 });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Couldn't add that sound. (${detail})`);
    } finally {
      setIsLoadingSound(false);
    }
  }

  function removeMusic() {
    setLibrarySound(null);
    updateState({ musicFile: null, musicStartMs: 0, originalVolume: 1 });
  }

  // A sound chosen before the editor opened (arriving from a sound's own
  // "use this sound" button) is attached as soon as the editor mounts, so
  // it's already in place rather than needing to be picked a second time.
  const initialSoundRef = useRef(initialSound);
  useEffect(() => {
    const pending = initialSoundRef.current;
    if (!pending) return;
    initialSoundRef.current = null;
    void chooseLibrarySound(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once for the sound the editor opened with
  }, []);

  function rotateClockwise() {
    setState((s) => {
      const currentIndex = ROTATION_STEPS.indexOf(s.rotation);
      const next = ROTATION_STEPS[(currentIndex + 1) % ROTATION_STEPS.length];
      return { ...s, rotation: next };
    });
  }

  function commitText(value: { text: string; color: string; fontId: TextFontId; fontSize: number }) {
    const editingId = textComposer?.layerId ?? null;
    if (editingId) {
      updateTextLayer(editingId, value);
    } else {
      const layer: TextLayer = {
        id: crypto.randomUUID(),
        x: 0.5,
        y: 0.42,
        isSticker: false,
        ...value,
      };
      setState((s) => ({ ...s, textLayers: [...s.textLayers, layer] }));
    }
    setTextComposer(null);
    setSelectedTextId(null);
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
    setStickerSheetOpen(false);
    setTool("sticker");
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

    // Text and stickers are dragged by their own handles (LayerHandles);
    // a press on the bare picture just lets go of whatever was selected.
    const cropPanEnabled =
      tool === "crop" && aspectNeedsPan(state.aspect, videoDims.width, videoDims.height, state.rotation);
    if (!cropPanEnabled) {
      if (tool === "sticker" || tool === null) {
        setSelectedTextId(null);
        if (tool === "sticker") setTool(null);
      }
      return;
    }

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
      updateState({ panOffset: panAxisIsX ? fracX : fracY });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /** Last step before handing the clip back: brings an oversized file
   * down to feed size (shrink-video.ts) so every view of the post costs
   * less bandwidth. Hands back the original whenever shrinking can't help. */
  async function finishWith(file: File) {
    const final = await shrinkVideoForFeed(file, {
      onStart: () => {
        setCompressionProgress(0);
        setCompressionStage("compressing");
      },
      onProgress: setCompressionProgress,
    });
    setCompressionStage("idle");
    onExported(final, librarySound, state.musicStartMs);
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
      state.filterIntensity === baseline.filterIntensity &&
      state.textLayers.length === 0 &&
      state.drawStrokes.length === 0 &&
      state.musicFile === null &&
      state.musicStartMs === baseline.musicStartMs &&
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
      await finishWith(source);
      return;
    }

    // Created here, before the first await, while this tap still counts —
    // the export's audio mix runs on it, and one created later can be
    // left suspended by the browser, which saves the clip silent.
    const needsAudio = state.originalVolume > 0 || !!state.musicFile || !!state.voiceoverFile;
    let audioContext: AudioContext | null = null;
    if (needsAudio && !isUnedited) {
      try {
        audioContext = createAudioContext();
        audioContext.resume().catch(() => {});
      } catch {
        audioContext = null;
      }
    }
    const releaseAudioContext = () => {
      audioContext?.close().catch(() => {});
      audioContext = null;
    };

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
        releaseAudioContext();
        const detail = err instanceof Error ? err.message : String(err);
        setError(
          `Couldn't compress that video for posting. (${detail}) Try recording at 720p or 1080p instead of 4K/120fps.`,
        );
        return;
      }
      setCompressionStage("idle");

      if (isUnedited) {
        releaseAudioContext();
        await finishWith(effectiveSource);
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
        releaseAudioContext();
        const detail = err instanceof Error ? err.message : String(err);
        setError(`Couldn't finish editing that video. (${detail})`);
        return;
      }
    }

    try {
      // exportVideo closes the context from here on, on every path.
      const { blob, extension } = await exportVideo(video, effectiveSource, state, { audioContext });
      const file = new File([blob], `sorza-clip.${extension}`, { type: blob.type });
      await finishWith(file);
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
  const editingLayer = textComposer?.layerId
    ? (state.textLayers.find((l) => l.id === textComposer.layerId) ?? null)
    : null;
  // How much of a sound this clip can actually use — the trimmed length,
  // sped up or slowed down by the chosen rate.
  const clipDurationMs = Math.max(
    500,
    ((state.trimEnd - state.trimStart) / Math.max(state.playbackRate, 0.1)) * 1000,
  );
  const isBusy = isExporting || compressionStage !== "idle";
  const baseline = baselineStateRef.current;
  const isTrimmed =
    baseline !== null && (state.trimStart !== baseline.trimStart || state.trimEnd !== baseline.trimEnd);
  const effectiveMusicDurationMs = librarySound?.duration_ms ?? musicDurationMs;
  const soundLabel = librarySound ? librarySound.title : state.musicFile ? "Your sound" : null;

  const railTools: { id: RailTool; label: string; icon: typeof ScissorsIcon; badge?: boolean }[] = [
    { id: "text", label: "Text", icon: TextToolIcon, badge: state.textLayers.some((l) => !l.isSticker) },
    { id: "stickers", label: "Stickers", icon: StickerIcon, badge: state.textLayers.some((l) => l.isSticker) },
    { id: "filter", label: "Filters", icon: FilterIcon, badge: state.filterId !== "original" },
    { id: "draw", label: "Draw", icon: BrushIcon, badge: state.drawStrokes.length > 0 },
    { id: "trim", label: "Trim", icon: ScissorsIcon, badge: isTrimmed },
    { id: "speed", label: "Speed", icon: SpeedIcon, badge: state.playbackRate !== 1 },
    { id: "crop", label: "Crop", icon: CropIcon, badge: state.aspect !== "9:16" || state.rotation !== 0 },
    { id: "voice", label: "Voice", icon: MicIcon, badge: !!state.voiceoverFile },
  ];

  function selectRailTool(id: RailTool) {
    setSelectedTextId(null);
    if (id === "text") {
      setTool(null);
      setTextComposer({ layerId: null });
    } else if (id === "stickers") {
      setTool(null);
      setStickerSheetOpen(true);
    } else {
      setTool((t) => (t === id ? null : id));
    }
  }

  function handleLayerTap(layer: TextLayer) {
    if (layer.isSticker) {
      setSelectedTextId(layer.id);
      setTool("sticker");
    } else {
      setTool(null);
      setTextComposer({ layerId: layer.id });
    }
  }

  return (
    // Any tap anywhere in the editor is a chance to get sound back — see
    // unlockAudio. touchend and click, not pointerdown: a touch only
    // counts as permission for sound once the finger lifts.
    <div
      data-no-edge-swipe
      onTouchEndCapture={unlockAudio}
      onClickCapture={unlockAudio}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <StudioStage ratio={canvasSize.width / canvasSize.height}>
          <div
            ref={previewRef}
            onPointerDown={handlePreviewPointerDown}
            className="relative h-full w-full touch-none overflow-hidden rounded-[22px] bg-[#111113]"
          >
            {/* The decode source the canvas draws from, sitting right
                under it. It used to be parked off-screen, and WebKit pauses
                a muted or soundless video it considers invisible — the
                preview then froze or stayed blank. Under the canvas it
                counts as on screen, while only the composited canvas shows.

                No `loop` attribute: the edit preview effect already resets
                currentTime itself once playback reaches trimEnd. The native
                attribute doing the same thing independently is what broke
                export — the browser's own auto-restart-on-end fired ahead
                of export's "did we reach trimEnd" check. */}
            <video
              ref={videoRef}
              src={sourceUrl}
              playsInline
              preload="auto"
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
            <canvas ref={canvasRef} className="relative h-full w-full" />
            {!ready && !loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111113] text-white/55">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
                <span className="text-[0.8125rem] font-medium">Loading clip</span>
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#111113] px-8 text-center">
                <p className="text-[0.9375rem] leading-relaxed text-white/80">{loadError}</p>
                <button
                  type="button"
                  onClick={onCancel}
                  className="pressable h-10 rounded-full bg-white px-5 text-[0.875rem] font-semibold text-black"
                >
                  Choose another
                </button>
              </div>
            )}
            {soundBlocked && ready && !isExporting && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={unlockAudio}
                className="pressable absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[0.8125rem] font-semibold text-white backdrop-blur-xl"
              >
                <VolumeIcon muted className="h-4 w-4" />
                Tap for sound
              </button>
            )}
            <LayerHandles
              layers={state.textLayers}
              selectedId={selectedTextId}
              previewRef={previewRef}
              interactive={tool === null || tool === "sticker"}
              onMove={(id, x, y) => updateTextLayer(id, { x, y })}
              onTap={handleLayerTap}
              onDelete={(id) => {
                removeTextLayer(id);
                if (tool === "sticker") setTool(null);
              }}
              onDragStateChange={setIsDraggingLayer}
            />
          </div>
        </StudioStage>

        <StudioHeader
          onBack={onCancel}
          backLabel="Back to camera"
          center={
            !isDraggingLayer &&
            !loadError && (
              <button
                type="button"
                onClick={() => (state.musicFile ? setTool("music") : setSoundPickerOpen(true))}
                disabled={isLoadingSound}
                className="pressable flex min-w-0 max-w-full items-center gap-2 rounded-full bg-black/40 px-3.5 py-2 text-[0.875rem] font-semibold text-white backdrop-blur-xl disabled:opacity-70"
              >
                <MusicIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {isLoadingSound ? "Adding sound…" : (soundLabel ?? "Add sound")}
                </span>
              </button>
            )
          }
        />

        <StudioRail
          tools={railTools}
          active={tool === "filter" || tool === "draw" || tool === "trim" || tool === "speed" || tool === "crop" || tool === "voice" ? tool : null}
          onSelect={selectRailTool}
          hidden={tool !== null || isDraggingLayer || !!loadError}
        />

        {error && (
          <div className="animate-rise-in absolute inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-30">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
      </div>

      <audio ref={musicAudioRef} className="hidden" />
      <audio ref={voiceoverAudioRef} className="hidden" />

      <StudioDeck>
        {tool === "trim" && (
          <StudioPanel title={TOOL_TITLES.trim} onDone={() => setTool(null)}>
            <TrimScrubber
              duration={duration}
              trimStart={state.trimStart}
              trimEnd={state.trimEnd}
              onChange={(trimStart, trimEnd) => updateState({ trimStart, trimEnd })}
              source={source}
              getCurrentTime={getPreviewTime}
            />
          </StudioPanel>
        )}

        {tool === "crop" && (
          <StudioPanel title={TOOL_TITLES.crop} onDone={() => setTool(null)}>
            <CropControls
              aspect={state.aspect}
              onAspect={(aspect) => updateState({ aspect, panOffset: 0.5 })}
              onRotate={rotateClockwise}
              canPan={aspectNeedsPan(state.aspect, videoDims.width, videoDims.height, state.rotation)}
            />
          </StudioPanel>
        )}

        {tool === "speed" && (
          <StudioPanel title={TOOL_TITLES.speed} onDone={() => setTool(null)}>
            <div className="no-scrollbar flex items-center justify-center gap-2 overflow-x-auto px-4 pb-2 pt-3">
              {SPEED_PRESETS.map((p) => (
                <StudioChip
                  key={p.value}
                  active={state.playbackRate === p.value}
                  onClick={() => updateState({ playbackRate: p.value })}
                >
                  {p.label}
                </StudioChip>
              ))}
            </div>
          </StudioPanel>
        )}

        {tool === "filter" && (
          <StudioPanel title={TOOL_TITLES.filter} onDone={() => setTool(null)}>
            <FilterControls
              filterId={state.filterId}
              intensity={state.filterIntensity}
              previewSource={filterPreviewSource}
              onFilter={(filterId) => updateState({ filterId, filterIntensity: 1 })}
              onIntensity={(filterIntensity) => updateState({ filterIntensity })}
            />
          </StudioPanel>
        )}

        {tool === "draw" && (
          <StudioPanel title={TOOL_TITLES.draw} onDone={() => setTool(null)}>
            <DrawControls
              color={drawColor}
              width={drawWidth}
              canUndo={state.drawStrokes.length > 0}
              onColor={setDrawColor}
              onWidth={setDrawWidth}
              onUndo={undoDrawStroke}
              onClear={clearDrawStrokes}
            />
          </StudioPanel>
        )}

        {tool === "sticker" && selectedLayer?.isSticker && (
          <StudioPanel title={TOOL_TITLES.sticker} onDone={() => {
            setSelectedTextId(null);
            setTool(null);
          }}>
            <StickerControls
              layer={selectedLayer}
              onResize={(fontSize) => updateTextLayer(selectedLayer.id, { fontSize })}
              onDelete={() => {
                removeTextLayer(selectedLayer.id);
                setTool(null);
              }}
            />
          </StudioPanel>
        )}

        {tool === "voice" && (
          <StudioPanel title={TOOL_TITLES.voice} onDone={() => {
            if (isRecordingVoiceover) stopVoiceoverRecording();
            setTool(null);
          }}>
            <div className="flex items-center gap-4 px-4 pb-1 pt-3">
              <button
                type="button"
                onClick={isRecordingVoiceover ? stopVoiceoverRecording : startVoiceoverRecording}
                aria-label={isRecordingVoiceover ? "Stop recording" : "Record voiceover"}
                className={`pressable flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                  isRecordingVoiceover ? "bg-accent text-white" : "bg-white text-black"
                }`}
              >
                {isRecordingVoiceover ? (
                  <span className="h-5 w-5 rounded-[5px] bg-white" />
                ) : (
                  <MicIcon className="h-6 w-6" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold text-white">
                  {isRecordingVoiceover
                    ? "Recording…"
                    : state.voiceoverFile
                      ? "Voiceover added"
                      : "Talk over your clip"}
                </p>
                <p className="text-[0.8125rem] text-white/50">
                  {isRecordingVoiceover
                    ? "Tap the button to stop"
                    : "Plays from the start of your trim"}
                </p>
              </div>
              {state.voiceoverFile && !isRecordingVoiceover && (
                <div className="flex gap-2">
                  <StudioIconButton
                    onClick={() => voiceoverAudioRef.current?.play().catch(() => {})}
                    label="Play voiceover"
                  >
                    <PlayIcon className="h-4 w-4" />
                  </StudioIconButton>
                  <StudioIconButton
                    onClick={() => updateState({ voiceoverFile: null })}
                    label="Remove voiceover"
                    tone="danger"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </StudioIconButton>
                </div>
              )}
            </div>
            {state.voiceoverFile && !isRecordingVoiceover && (
              <div className="px-4 pt-3">
                <StudioSlider
                  label="Voiceover volume"
                  value={state.voiceoverVolume}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(voiceoverVolume) => updateState({ voiceoverVolume })}
                  display={`${Math.round(state.voiceoverVolume * 100)}%`}
                />
              </div>
            )}
          </StudioPanel>
        )}

        {tool === "music" && state.musicFile && (
          <StudioPanel title={TOOL_TITLES.music} onDone={() => setTool(null)}>
            <div className="flex flex-col gap-4 px-4 pb-1 pt-2">
              <div className="flex items-center gap-3">
                <SoundCover seed={librarySound?.id ?? state.musicFile.name} playing size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-semibold text-white">
                    {librarySound ? librarySound.title : state.musicFile.name}
                  </p>
                  <p className="truncate text-[0.8125rem] text-white/50">
                    {librarySound
                      ? librarySound.artist_name || "SORZA sound"
                      : "From this device"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundPickerOpen(true)}
                  className="pressable h-9 rounded-full bg-white/[0.1] px-3.5 text-[0.8125rem] font-semibold text-white"
                >
                  Change
                </button>
                <StudioIconButton onClick={() => {
                  removeMusic();
                  setTool(null);
                }} label="Remove sound" tone="danger">
                  <CloseIcon className="h-4 w-4" />
                </StudioIconButton>
              </div>

              {/* Which part of the track plays. The window is the clip's
                  own trimmed length rather than a fixed slice, so what the
                  waveform promises is exactly what the post carries. */}
              {effectiveMusicDurationMs > clipDurationMs + 250 && (
                <WaveformTrimmer
                  peaks={musicPeaks}
                  durationMs={effectiveMusicDurationMs}
                  windowMs={clipDurationMs}
                  startMs={state.musicStartMs}
                  onChange={(musicStartMs) => updateState({ musicStartMs })}
                  getPlaybackMs={getMusicPlaybackMs}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <StudioSlider
                  label="Added sound"
                  value={state.musicVolume}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(musicVolume) => updateState({ musicVolume })}
                  display={`${Math.round(state.musicVolume * 100)}%`}
                />
                <StudioSlider
                  label="Original sound"
                  value={state.originalVolume}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(originalVolume) => updateState({ originalVolume })}
                  display={`${Math.round(state.originalVolume * 100)}%`}
                />
              </div>
            </div>
          </StudioPanel>
        )}

        {(tool === null || (tool === "sticker" && !selectedLayer?.isSticker) || (tool === "music" && !state.musicFile)) && (
          <div className="px-4">
            <StudioAction
              onClick={handleDone}
              disabled={!ready || isBusy}
              busy={isBusy}
              progress={
                compressionStage === "compressing"
                  ? compressionProgress
                  : isExporting
                    ? progress
                    : compressionStage === "loading"
                      ? 0
                      : undefined
              }
            >
              {compressionStage === "loading" ? (
                "Preparing…"
              ) : compressionStage === "compressing" ? (
                `Compressing ${Math.round(compressionProgress * 100)}%`
              ) : isExporting ? (
                exportStage === "sound" ? (
                  "Preparing sound…"
                ) : progress >= 1 ? (
                  "Finishing…"
                ) : (
                  `Saving edits ${Math.round(progress * 100)}%`
                )
              ) : (
                <>
                  Next
                  <ChevronRightIcon className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </>
              )}
            </StudioAction>
          </div>
        )}
      </StudioDeck>

      {textComposer && (
        <TextComposer
          initial={
            editingLayer
              ? {
                  text: editingLayer.text,
                  color: editingLayer.color,
                  fontId: editingLayer.fontId,
                  fontSize: editingLayer.fontSize,
                }
              : null
          }
          onDone={commitText}
          onCancel={() => setTextComposer(null)}
          onDelete={
            editingLayer
              ? () => {
                  removeTextLayer(editingLayer.id);
                  setTextComposer(null);
                }
              : undefined
          }
        />
      )}

      {stickerSheetOpen && (
        <StickerSheet onPick={addStickerLayer} onClose={() => setStickerSheetOpen(false)} />
      )}

      {soundPickerOpen && (
        <SoundPickerSheet
          onSelect={(sound) => {
            void chooseLibrarySound(sound).then(() => setTool("music"));
          }}
          onClose={() => setSoundPickerOpen(false)}
          onPickDeviceFile={(file) => {
            setSoundPickerOpen(false);
            setLibrarySound(null);
            updateState({ musicFile: file, musicStartMs: 0, originalVolume: 0 });
            setTool("music");
          }}
        />
      )}
    </div>
  );
}
