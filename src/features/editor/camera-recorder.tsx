"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CameraFlipIcon,
  CloseIcon,
  CameraIcon,
  LockIcon,
  GalleryIcon,
  CheckIcon,
  BoltIcon,
  GridIcon,
  SettingsIcon,
  TimerIcon,
  MusicIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { StudioAction, StudioSheet } from "@/features/editor/studio-ui";

/** Exposure/white-balance/focus manual control and torch are all part of
 * the same still-non-standard, inconsistently-implemented MediaTrackConstraints
 * "Image Capture" extensions — TypeScript's built-in lib.dom types don't
 * know about any of them, so every capability check and constraint in
 * this file goes through this one cast rather than widening the real DOM
 * types used everywhere else. Real device support (especially on iOS
 * Safari/WKWebView) is sparse — every control built on this is feature-
 * detected and hidden entirely when unsupported, never shown as a control
 * that silently does nothing. */
interface ExtendedTrackCapabilities {
  torch?: boolean;
  exposureCompensation?: { min: number; max: number; step: number };
  exposureMode?: string[];
  whiteBalanceMode?: string[];
  colorTemperature?: { min: number; max: number; step: number };
  focusMode?: string[];
}
interface ExtendedTrackSettings {
  exposureCompensation?: number;
  colorTemperature?: number;
}
function getExtendedCapabilities(track: MediaStreamTrack | undefined): ExtendedTrackCapabilities {
  return (track?.getCapabilities?.() as ExtendedTrackCapabilities | undefined) ?? {};
}

const COUNTDOWN_STEPS = [0, 3, 10] as const;

/** The capture modes along the bottom carousel, TikTok-style: one photo
 * mode and three clip lengths. In a clip mode the shutter is tap to start
 * / tap to pause, or hold to record only while held — both gestures work
 * in every clip mode, so there's nothing to choose between before
 * shooting. */
type CaptureModeId = "photo" | "15s" | "60s" | "3m";
const CAPTURE_MODES: { id: CaptureModeId; label: string; maxSeconds: number | null }[] = [
  { id: "photo", label: "Photo", maxSeconds: null },
  { id: "15s", label: "15s", maxSeconds: 15 },
  { id: "60s", label: "60s", maxSeconds: 60 },
  { id: "3m", label: "3m", maxSeconds: 180 },
];
const DEFAULT_MODE: CaptureModeId = "60s";
const MODE_STORAGE_KEY = "sorza.cameraMode";

type ResolutionPreset = "720p" | "1080p" | "4k";
const RESOLUTION_PRESETS: Record<ResolutionPreset, { width: number; height: number; label: string }> = {
  "720p": { width: 1280, height: 720, label: "720p" },
  "1080p": { width: 1920, height: 1080, label: "1080p" },
  "4k": { width: 3840, height: 2160, label: "4K" },
};
// 120 is included because it was explicitly asked for, not because it's
// guaranteed — see the getUserMedia call below. frameRate is always an
// "ideal" hint the browser is free to fall short of, so asking for it is
// harmless; what it actually delivers depends entirely on the device.
const FPS_PRESETS = [30, 60, 120] as const;
type FpsPreset = (typeof FPS_PRESETS)[number];
const DEFAULT_RESOLUTION: ResolutionPreset = "720p";
const DEFAULT_FPS: FpsPreset = 60;

/** Formats a recorder has already refused on this device. isTypeSupported
 * can say yes to a format whose encoder then rejects the actual stream
 * (seen with MP4 in some Chromium builds), so a format that fails once is
 * skipped from then on and the next take falls through to the next one. */
const rejectedMimeTypes = new Set<string>();

function pickVideoMimeType(): string {
  // Must declare an audio codec, not just video (avc1 alone) — the stream
  // being recorded here always includes a real microphone track, and
  // MediaRecorder can drop the audio track entirely when the codecs
  // string only names a video codec. This is almost certainly why
  // recordings came out with no audio: it was silently video-only from
  // the moment it was captured, before the video ever reached the editor
  // or export — no amount of fixing the export pipeline could recover
  // audio that was never actually recorded in the first place.
  const candidates = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const type of candidates) {
    if (rejectedMimeTypes.has(type)) continue;
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

/** Scales target bitrate to the actual capture resolution and frame rate
 * — both user-selectable (see the settings sheet), defaulting to
 * 720p/60fps: chosen so the default per-second workload (pixels drawn/
 * encoded per second) comes out roughly the same or lower than the old
 * fixed 1080p/30fps (1280×720×60 ≈ 1920×1080×30), while frame rate — the
 * thing that actually reads as "smooth" motion — doubles. 4K and 120fps
 * are offered as explicit opt-ins, not the default, because they trade
 * that smoothness away. The in-app copy next to those options says so
 * rather than hiding the trade-off. */
function pickVideoBitsPerSecond(width: number, height: number, fps: number): number {
  const pixels = width * height;
  const bitsPerSecond = Math.round(pixels * 0.14 * fps);
  return Math.min(Math.max(bitsPerSecond, 4_000_000), 24_000_000);
}

/** Below this hold duration a shutter press is a tap; at or past it, it's
 * a hold — record only while the finger stays down. */
const HOLD_THRESHOLD_MS = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const TAP_MAX_MOVE_PX = 12;
const TAP_MAX_MS = 300;
const DOUBLE_TAP_MS = 300;
const SWIPE_MIN_PX = 60;
/** How often the recording clock re-reads elapsed time. Fine enough that
 * the progress bar moves smoothly instead of ticking once a second. */
const CLOCK_TICK_MS = 50;

function formatTime(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readStoredMode(): CaptureModeId {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (stored && CAPTURE_MODES.some((m) => m.id === stored)) return stored as CaptureModeId;
  } catch {
    // Private mode / blocked storage — just use the default.
  }
  return DEFAULT_MODE;
}

export function CameraRecorder({
  onCaptured,
  onClose,
  onImportRequested,
  soundTitle = null,
  soundUrl = null,
  onSoundRequested,
  onSoundCleared,
}: {
  onCaptured: (file: File, kind: "photo" | "video") => void;
  onClose: () => void;
  /** Opens the device's own photo/video picker. Optional: a bare camera
   * with no import path is still a valid use of this component. */
  onImportRequested?: () => void;
  /** The sound picked for this post, if any. It plays from its start
   * while recording so the clip can be shot to the beat, and pauses with
   * every pause between segments, so clip time and sound time stay
   * lined up — which is exactly how the editor mixes it in (from the
   * top, with the mic ducked). */
  soundTitle?: string | null;
  soundUrl?: string | null;
  onSoundRequested?: () => void;
  onSoundCleared?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundAudioRef = useRef<HTMLAudioElement>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const discardRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdModeRef = useRef(false);
  const gestureConsumedRef = useRef(false);
  const zoomRef = useRef(1);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapAtRef = useRef(0);
  const focusHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  // Recording time is kept as "time banked from finished segments" plus
  // "when the current segment started", rather than a counter bumped once
  // a second — a 1-second tick drops up to a second per segment, and over
  // several pauses the bar and the real clip length drift apart.
  const bankedMsRef = useRef(0);
  const segmentStartedAtRef = useRef<number | null>(null);
  const maxMsRef = useRef(60_000);
  const modeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hasDrawnFrameRef = useRef(false);

  const [mode, setMode] = useState<CaptureModeId>(DEFAULT_MODE);
  const [modeShift, setModeShift] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [streamKey, setStreamKey] = useState(0);
  const [isStarting, setIsStarting] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [isHoldRecording, setIsHoldRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [segmentMarks, setSegmentMarks] = useState<number[]>([]);
  const [countdownSeconds, setCountdownSeconds] = useState<(typeof COUNTDOWN_STEPS)[number]>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [resolution, setResolution] = useState<ResolutionPreset>(DEFAULT_RESOLUTION);
  const [fps, setFps] = useState<FpsPreset>(DEFAULT_FPS);
  const [exposureRange, setExposureRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [exposureCompensation, setExposureCompensation] = useState(0);
  const [colorTempRange, setColorTempRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [whiteBalanceMode, setWhiteBalanceMode] = useState<"continuous" | "manual">("continuous");
  const [colorTemperature, setColorTemperature] = useState<number | null>(null);
  const [aeAfLockSupported, setAeAfLockSupported] = useState(false);
  const [aeAfLocked, setAeAfLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomHintVisible, setZoomHintVisible] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; id: number } | null>(null);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [flipSpin, setFlipSpin] = useState(0);

  const activeMode = CAPTURE_MODES.find((m) => m.id === mode) ?? CAPTURE_MODES[2];
  const isPhotoMode = activeMode.maxSeconds === null;
  const maxMs = (activeMode.maxSeconds ?? 60) * 1000;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    maxMsRef.current = maxMs;
  }, [maxMs]);

  // The last mode used is the one the camera opens in next time — someone
  // who only ever shoots photos shouldn't have to swipe over every time.
  // Read after mount (not as the initial state) so the server-rendered
  // markup and the first client render agree.
  useEffect(() => {
    const stored = readStoredMode();
    if (stored !== DEFAULT_MODE) void Promise.resolve().then(() => setMode(stored));
  }, []);

  function chooseMode(next: CaptureModeId) {
    if (hasSession) return;
    setMode(next);
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, next);
    } catch {
      // Best-effort only.
    }
  }

  // Keeps the active mode label centred under the shutter, the way the
  // carousel sits in TikTok/Instagram — measured, since the labels are
  // text of differing widths.
  useLayoutEffect(() => {
    const index = CAPTURE_MODES.findIndex((m) => m.id === mode);
    const el = modeRefs.current[index];
    const row = el?.parentElement;
    const viewport = row?.parentElement;
    if (!el || !viewport) return;
    setModeShift(viewport.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2));
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    hasDrawnFrameRef.current = false;

    (async () => {
      setIsStarting(true);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera. You can still upload from your library.");
        setIsStarting(false);
        return;
      }
      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const { width, height } = RESOLUTION_PRESETS[resolution];
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            // Soft ("ideal") constraints — the browser picks the closest
            // resolution/frame rate the camera actually supports rather
            // than failing outright.
            width: { ideal: width },
            height: { ideal: height },
            frameRate: { ideal: fps },
          },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          // Some WebKit/WKWebView contexts don't reliably honor the
          // `autoPlay` attribute after srcObject is set programmatically
          // — without this the preview can stay a black frame even
          // though the stream itself is live.
          el.play().catch(() => {});
        }
        // Every one of these is a rear-camera-only-in-practice, sparsely
        // supported feature — reset on every stream (including a facing-
        // mode flip or a resolution/fps change, both of which force a new
        // getUserMedia call) rather than trusting stale state, since the
        // new stream's track is a fresh object with its own capabilities.
        const track = stream.getVideoTracks()[0];
        const caps = getExtendedCapabilities(track);

        setTorchSupported(!!caps.torch);
        setTorchOn(false);

        if (caps.exposureCompensation) {
          setExposureRange(caps.exposureCompensation);
          const settings = track?.getSettings?.() as ExtendedTrackSettings | undefined;
          setExposureCompensation(settings?.exposureCompensation ?? 0);
        } else {
          setExposureRange(null);
          setExposureCompensation(0);
        }

        if (caps.whiteBalanceMode?.includes("manual") && caps.colorTemperature) {
          setColorTempRange(caps.colorTemperature);
        } else {
          setColorTempRange(null);
        }
        setWhiteBalanceMode("continuous");
        setColorTemperature(null);

        setAeAfLockSupported(!!caps.focusMode?.includes("manual") || !!caps.exposureMode?.includes("manual"));
        setAeAfLocked(false);

        setError(null);
      } catch {
        setError(
          "SORZA can't use your camera. Allow camera and microphone access for SORZA in your device settings, or upload from your library.",
        );
        setIsStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, resolution, fps, streamKey]);

  // Continuously draws the (zoom-cropped, mirrored) camera frame onto the
  // visible canvas — this is what the live preview shows AND what photo
  // and video capture both read from, so pinch-zoom actually ends up baked
  // into the captured output instead of being a preview-only visual trick
  // that vanishes the moment you take the shot.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let lastDrawAt = 0;
    // Throttled to the capture frame rate — drawing at the display's own
    // 60-120Hz is wasted work that contends with the encoder.
    const frameIntervalMs = 1000 / fps;
    function draw() {
      const now = performance.now();
      if (now - lastDrawAt < frameIntervalMs) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastDrawAt = now;
      const vw = video!.videoWidth;
      const vh = video!.videoHeight;
      if (vw && vh) {
        if (canvas!.width !== vw || canvas!.height !== vh) {
          canvas!.width = vw;
          canvas!.height = vh;
        }
        const z = zoomRef.current;
        const sw = vw / z;
        const sh = vh / z;
        const sx = (vw - sw) / 2;
        const sy = (vh - sh) / 2;
        ctx!.save();
        if (facingMode === "user") {
          ctx!.translate(canvas!.width, 0);
          ctx!.scale(-1, 1);
        }
        ctx!.drawImage(video!, sx, sy, sw, sh, 0, 0, canvas!.width, canvas!.height);
        ctx!.restore();
        // Once per stream, not once per frame — a state update on every
        // frame would re-render the whole camera at the capture rate.
        if (!hasDrawnFrameRef.current) {
          hasDrawnFrameRef.current = true;
          setIsStarting(false);
        }
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [facingMode, fps]);

  useEffect(() => {
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (focusHideTimerRef.current) clearTimeout(focusHideTimerRef.current);
      if (zoomHintTimerRef.current) clearTimeout(zoomHintTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      // Leaving mid-recording throws the clip away rather than handing a
      // half-finished file to a screen that's no longer there.
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        discardRef.current = true;
        recorder.stop();
      }
    };
  }, []);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      // Device advertised torch support but rejected the constraint —
      // leave the toggle in its previous state rather than lying about it.
    }
  }

  // Optimistic — a live slider that reverted mid-drag on a rejected
  // constraint would feel broken, and this is a best-effort hardware
  // control on an already-feature-detected capability.
  function applyExposureCompensation(value: number) {
    setExposureCompensation(value);
    const track = streamRef.current?.getVideoTracks()[0];
    track?.applyConstraints({ advanced: [{ exposureCompensation: value } as MediaTrackConstraintSet] }).catch(() => {});
  }

  function setWhiteBalanceManualTemp(temp: number) {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    setWhiteBalanceMode("manual");
    setColorTemperature(temp);
    track
      .applyConstraints({
        advanced: [{ whiteBalanceMode: "manual", colorTemperature: temp } as MediaTrackConstraintSet],
      })
      .catch(() => {});
  }

  function setWhiteBalanceAuto() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    setWhiteBalanceMode("continuous");
    setColorTemperature(null);
    track.applyConstraints({ advanced: [{ whiteBalanceMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
  }

  async function toggleAeAfLock() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !aeAfLocked;
    try {
      await track.applyConstraints({
        advanced: [
          { focusMode: next ? "manual" : "continuous", exposureMode: next ? "manual" : "continuous" } as MediaTrackConstraintSet,
        ],
      });
      setAeAfLocked(next);
    } catch {
      // Same reasoning as toggleTorch.
    }
  }

  function flipCamera() {
    // A flip swaps the whole getUserMedia stream, including the mic track
    // an in-progress recording is reading from, so it's only offered
    // between clips, never during one.
    if (hasSession) return;
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
    setFlipSpin((n) => n + 1);
  }

  function cycleCountdown() {
    const index = COUNTDOWN_STEPS.indexOf(countdownSeconds);
    setCountdownSeconds(COUNTDOWN_STEPS[(index + 1) % COUNTDOWN_STEPS.length]);
  }

  // Self-timer: delays a photo or the start of a recording. Only ever
  // wraps the gesture that starts something new — never a resume between
  // segments, which would be a jarring few-second delay every time.
  function runWithCountdown(action: () => void) {
    if (countdownSeconds === 0) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setCountdown(countdownSeconds);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          const fn = pendingActionRef.current;
          pendingActionRef.current = null;
          if (fn) setTimeout(fn, 0);
          return null;
        }
        return c - 1;
      });
    }, 1000);
  }

  function cancelCountdown() {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    pendingActionRef.current = null;
    setCountdown(null);
  }

  function capturePhoto() {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return;
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 160);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCaptured(new File([blob], "photo.jpg", { type: "image/jpeg" }), "photo");
      },
      "image/jpeg",
      0.95,
    );
  }

  function readElapsedMs() {
    const started = segmentStartedAtRef.current;
    return bankedMsRef.current + (started === null ? 0 : performance.now() - started);
  }

  function startClock() {
    if (clockRef.current) clearInterval(clockRef.current);
    clockRef.current = setInterval(() => {
      const total = readElapsedMs();
      setElapsedMs(total);
      if (total >= maxMsRef.current) finishRecording();
    }, CLOCK_TICK_MS);
  }

  function stopClock() {
    if (clockRef.current) clearInterval(clockRef.current);
    clockRef.current = null;
  }

  function sessionIsOpen() {
    const recorder = recorderRef.current;
    return !!recorder && recorder.state !== "inactive";
  }

  function startRecording() {
    if (sessionIsOpen()) return;
    const stream = streamRef.current;
    const canvas = canvasRef.current;
    if (!stream || !canvas || !canvas.width) return;

    const canvasStream = canvas.captureStream(fps);

    // Feeding the mic's own MediaStreamTrack straight into a MediaStream
    // built alongside an unrelated canvas video track is a known WebKit
    // (WKWebView, i.e. the iOS app) combination that records video-only.
    // Routing it through a real Web Audio graph first and recording
    // *that* destination's track instead is the standard workaround, and
    // the same technique use-video-export.ts relies on for its own mixing.
    const audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const audioDestination = audioCtx.createMediaStreamDestination();
    audioCtx.createMediaStreamSource(stream).connect(audioDestination);
    audioCtxRef.current = audioCtx;

    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);

    chunksRef.current = [];
    discardRef.current = false;
    setRecordError(null);
    const mimeType = pickVideoMimeType();
    const baseType = mimeType.split(";")[0];
    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: pickVideoBitsPerSecond(canvas.width, canvas.height, fps),
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    // A recorder can die on its own — an encoder that rejects the
    // configuration, a device that runs out of something mid-take. Without
    // this the screen kept counting as if it were recording, and the empty
    // file it eventually produced went on to fail in the editor with no
    // explanation.
    recorder.onerror = (event) => {
      const reason = (event as Event & { error?: DOMException }).error?.message;
      rejectedMimeTypes.add(mimeType);
      discardRef.current = true;
      closeSession();
      setRecordError(
        `Recording stopped${reason ? ` (${reason})` : ""}. Tap record to try again — SORZA will use a different format.`,
      );
    };
    recorder.onstop = () => {
      combined.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      if (discardRef.current) {
        discardRef.current = false;
        chunksRef.current = [];
        return;
      }
      const blob = new Blob(chunksRef.current, { type: baseType });
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      onCaptured(new File([blob], `recording.${extension}`, { type: baseType }), "video");
    };
    recorder.start(1000);
    recorderRef.current = recorder;

    bankedMsRef.current = 0;
    segmentStartedAtRef.current = performance.now();
    setElapsedMs(0);
    setSegmentMarks([]);
    setIsRecording(true);
    setHasSession(true);
    startClock();

    const sound = soundAudioRef.current;
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  function pauseSegment() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.pause();
    const started = segmentStartedAtRef.current;
    if (started !== null) {
      bankedMsRef.current += performance.now() - started;
      segmentStartedAtRef.current = null;
    }
    const banked = bankedMsRef.current;
    setElapsedMs(banked);
    setSegmentMarks((marks) => [...marks, banked]);
    setIsRecording(false);
    holdModeRef.current = false;
    setIsHoldRecording(false);
    stopClock();
    soundAudioRef.current?.pause();
  }

  function resumeSegment() {
    const recorder = recorderRef.current;
    if (recorder?.state !== "paused") return;
    recorder.resume();
    segmentStartedAtRef.current = performance.now();
    setIsRecording(true);
    startClock();
    soundAudioRef.current?.play().catch(() => {});
  }

  function closeSession() {
    stopClock();
    segmentStartedAtRef.current = null;
    bankedMsRef.current = 0;
    holdModeRef.current = false;
    setIsHoldRecording(false);
    setIsRecording(false);
    setHasSession(false);
    setElapsedMs(0);
    setSegmentMarks([]);
    const sound = soundAudioRef.current;
    if (sound) {
      sound.pause();
      sound.currentTime = 0;
    }
  }

  function finishRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    closeSession();
  }

  function discardRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      discardRef.current = true;
      recorder.stop();
    }
    closeSession();
    setIsDiscardOpen(false);
  }

  function handleClose() {
    if (hasSession) {
      if (isRecording) pauseSegment();
      setIsDiscardOpen(true);
      return;
    }
    onClose();
  }

  function handleShutterDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (error || countdown !== null || isStarting) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPressing(true);
    if (isPhotoMode) return;
    if (isRecording) {
      // A press while recording is always "stop here" — answered on the
      // way down, not on release, so it feels as immediate as the press
      // that started it. The release that follows is swallowed.
      pauseSegment();
      gestureConsumedRef.current = true;
      return;
    }
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      holdModeRef.current = true;
      setIsHoldRecording(true);
      if (sessionIsOpen()) resumeSegment();
      else startRecording();
    }, HOLD_THRESHOLD_MS);
  }

  function handleShutterUp() {
    setIsPressing(false);
    if (gestureConsumedRef.current) {
      gestureConsumedRef.current = false;
      return;
    }
    if (countdown !== null || error || isStarting) return;
    if (isPhotoMode) {
      runWithCountdown(capturePhoto);
      return;
    }
    if (holdTimerRef.current) {
      // Released before the hold threshold — a tap: start (or resume) and
      // keep going hands-free until the next tap.
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      holdModeRef.current = false;
      if (sessionIsOpen()) resumeSegment();
      else runWithCountdown(startRecording);
      return;
    }
    // The end of a hold-to-record.
    if (isRecording && holdModeRef.current) pauseSegment();
  }

  function handleShutterCancel() {
    setIsPressing(false);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isRecording && holdModeRef.current) pauseSegment();
  }

  // One finger that stays put is a focus tap (two quick ones flip the
  // camera), one finger travelling sideways switches capture mode, and two
  // fingers are a pinch.
  function handleViewfinderDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      tapStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    } else {
      tapStartRef.current = null;
      const pts = [...pointersRef.current.values()];
      pinchStartRef.current = {
        distance: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        zoom: zoomRef.current,
      };
    }
  }

  function handleViewfinderMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size >= 2 && pinchStartRef.current) {
      const pts = [...pointersRef.current.values()];
      const distance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, pinchStartRef.current.zoom * (distance / pinchStartRef.current.distance)),
      );
      setZoom(next);
      flashZoomHint();
    }
  }

  function handleViewfinderUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const start = tapStartRef.current;
    const single = pointersRef.current.size === 1 && !!start;
    const dx = start ? e.clientX - start.x : 0;
    const dy = start ? e.clientY - start.y : 0;
    const wasTap =
      single && Date.now() - start!.time < TAP_MAX_MS && Math.hypot(dx, dy) < TAP_MAX_MOVE_PX;
    // Ignores swipes starting at the very left edge — that's the system
    // back gesture's territory.
    const wasSwipe =
      single && start!.x > 32 && Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) tapStartRef.current = null;

    if (wasSwipe && !hasSession) {
      const index = CAPTURE_MODES.findIndex((m) => m.id === mode);
      const next = CAPTURE_MODES[Math.min(CAPTURE_MODES.length - 1, Math.max(0, index + (dx < 0 ? 1 : -1)))];
      chooseMode(next.id);
      return;
    }
    if (!wasTap) return;
    const now = Date.now();
    if (now - lastTapAtRef.current < DOUBLE_TAP_MS) {
      lastTapAtRef.current = 0;
      flipCamera();
      return;
    }
    lastTapAtRef.current = now;
    focusAt(e);
  }

  function flashZoomHint() {
    setZoomHintVisible(true);
    if (zoomHintTimerRef.current) clearTimeout(zoomHintTimerRef.current);
    zoomHintTimerRef.current = setTimeout(() => setZoomHintVisible(false), 900);
  }

  function toggleZoomPreset() {
    setZoom((z) => (z < 1.95 ? 2 : 1));
    flashZoomHint();
  }

  function focusAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setFocusPoint({ x: px, y: py, id: Date.now() });
    if (focusHideTimerRef.current) clearTimeout(focusHideTimerRef.current);
    focusHideTimerRef.current = setTimeout(() => setFocusPoint(null), 700);

    // Real hardware refocus where the browser/device supports it — the
    // reticle shows regardless, since continuous autofocus means the
    // camera is very likely already sharp there.
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.();
    if (!track || !capabilities?.pointsOfInterest) return;
    // The camera's own coordinate space isn't mirrored even when the
    // preview is (front camera) — flip x back before handing it off.
    const nx = facingMode === "user" ? 1 - px / rect.width : px / rect.width;
    const ny = py / rect.height;
    track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x: nx, y: ny }] }] }).catch(() => {});
  }

  const progress = Math.min(1, elapsedMs / maxMs);
  const chromeHidden = hasSession;
  const hint = error
    ? null
    : isPhotoMode
      ? "Tap to take a photo"
      : isRecording
        ? isHoldRecording
          ? "Release to pause"
          : "Tap to pause"
        : hasSession
          ? "Tap or hold to keep recording"
          : "Tap or hold to record";

  return (
    <div className="absolute inset-0 z-10 flex select-none flex-col overflow-hidden bg-black">
      {/* Real (if off-screen) size on purpose, not `display:none` — WebKit
          stops decoding a `display:none` <video> entirely, and this
          element is the source the canvas below draws from every frame. */}
      <video ref={videoRef} autoPlay muted playsInline className="fixed left-[-9999px] top-0 h-40 w-40" />
      {soundUrl && <audio ref={soundAudioRef} src={soundUrl} preload="auto" />}

      {/* The viewfinder is a rounded card that stops above the bottom
          controls, the way TikTok's and Snapchat's do, so the controls sit
          on solid black instead of fighting the scene for contrast. */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-b-[28px] bg-[#0b0b0c]">
        <canvas
          ref={canvasRef}
          onPointerDown={handleViewfinderDown}
          onPointerMove={handleViewfinderMove}
          onPointerUp={handleViewfinderUp}
          onPointerCancel={handleViewfinderUp}
          className={`absolute inset-0 h-full w-full touch-none object-cover transition-opacity duration-500 ${
            isStarting ? "opacity-0" : "opacity-100"
          }`}
        />

        {isStarting && !error && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/55">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
            <span className="text-[0.8125rem] font-medium">Opening camera</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-40 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-40 bg-gradient-to-t from-black/45 to-transparent" />

        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-[6] bg-white transition-opacity duration-150 ${
            captureFlash ? "opacity-85" : "opacity-0"
          }`}
        />

        {gridEnabled && (
          <div className="pointer-events-none absolute inset-0 z-[4]">
            <span className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
            <span className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
            <span className="absolute left-0 top-1/3 h-px w-full bg-white/25" />
            <span className="absolute left-0 top-2/3 h-px w-full bg-white/25" />
          </div>
        )}

        {focusPoint && (
          <span
            key={focusPoint.id}
            className="animate-focus-ring pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[#ffd60a]"
            style={{ left: focusPoint.x, top: focusPoint.y }}
          >
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <rect x="2" y="2" width="68" height="68" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M36 2v6M36 64v6M2 36h6M64 36h6" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        )}

        {zoomHintVisible && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="numeral rounded-full bg-black/55 px-3.5 py-1.5 text-[1.0625rem] font-semibold text-white backdrop-blur-xl">
              {zoom.toFixed(1)}×
            </span>
          </div>
        )}

        {/* Recording progress across the very top — one bar for the whole
            clip with a hairline at every pause, so the segments read. */}
        {hasSession && (
          <div className="absolute inset-x-3 top-[calc(0.5rem+env(safe-area-inset-top))] z-20 h-[4px] overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
            {segmentMarks.map((mark, i) => (
              <span
                key={i}
                className="absolute top-0 h-full w-[2px] bg-white"
                style={{ left: `calc(${(mark / maxMs) * 100}% - 1px)` }}
              />
            ))}
          </div>
        )}

        {/* Top row: close, the sound pill, nothing on the right (the tool
            rail starts beneath). */}
        <div className="absolute inset-x-0 top-0 z-20 grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-3 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={handleClose}
            aria-label={hasSession ? "Discard or keep this clip" : "Close camera"}
            className="pressable flex h-11 w-11 items-center justify-center rounded-full text-white [filter:drop-shadow(0_1px_3px_rgb(0_0_0/0.6))]"
          >
            <CloseIcon className="h-6 w-6" />
          </button>

          <div className="flex min-w-0 justify-center">
            {hasSession ? (
              <span className="numeral flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-[0.9375rem] font-semibold text-white backdrop-blur-xl">
                <span className={`h-2 w-2 rounded-full bg-accent ${isRecording ? "animate-pulse" : ""}`} />
                {formatTime(elapsedMs)}
                <span className="text-white/45">/ {formatTime(maxMs)}</span>
              </span>
            ) : (
              onSoundRequested && (
                <SoundPill title={soundTitle} onOpen={onSoundRequested} onClear={onSoundCleared} />
              )
            )}
          </div>
          <span />
        </div>

        {/* Tool rail, TikTok-style: icons with their names under them,
            stacked down the right edge. Out of the way while recording. */}
        {!error && (
          <div
            className={`absolute right-2 top-[calc(4.25rem+env(safe-area-inset-top))] z-20 flex flex-col items-center gap-3.5 transition-opacity duration-300 ${
              chromeHidden ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <RailButton label="Flip" onClick={flipCamera}>
              <CameraFlipIcon
                className="h-[26px] w-[26px] transition-transform duration-500 ease-[var(--ease-ios)]"
                style={{ transform: `rotate(${flipSpin * 180}deg)` }}
              />
            </RailButton>
            {torchSupported && (
              <RailButton label="Flash" onClick={toggleTorch} active={torchOn}>
                <BoltIcon className="h-[26px] w-[26px]" />
              </RailButton>
            )}
            <RailButton
              label={countdownSeconds === 0 ? "Timer" : `${countdownSeconds}s`}
              onClick={cycleCountdown}
              active={countdownSeconds !== 0}
            >
              <TimerIcon className="h-[26px] w-[26px]" />
            </RailButton>
            <RailButton label="Grid" onClick={() => setGridEnabled((g) => !g)} active={gridEnabled}>
              <GridIcon className="h-[26px] w-[26px]" />
            </RailButton>
            <RailButton label="Settings" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon className="h-[26px] w-[26px]" />
            </RailButton>
          </div>
        )}

        {!error && !isStarting && (
          <button
            type="button"
            onClick={toggleZoomPreset}
            aria-label={zoom > 1 ? "Zoom out to 1×" : "Zoom in to 2×"}
            className={`pressable numeral absolute bottom-4 left-1/2 z-20 flex h-9 min-w-9 -translate-x-1/2 items-center justify-center rounded-full bg-black/40 px-2 text-[0.8125rem] font-semibold backdrop-blur-xl transition-opacity duration-300 ${
              zoom > 1.05 ? "text-[#ffd60a]" : "text-white"
            } ${isRecording ? "opacity-0" : "opacity-100"}`}
          >
            {zoom > 1.05 ? `${zoom.toFixed(1)}×` : "1×"}
          </button>
        )}

        {countdown !== null && (
          <button
            type="button"
            onClick={cancelCountdown}
            aria-label="Cancel countdown"
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-black/30"
          >
            <span key={countdown} className="animate-countdown-pulse numeral text-[8rem] font-bold leading-none text-white drop-shadow-lg">
              {countdown}
            </span>
            <span className="rounded-full bg-black/45 px-3.5 py-1.5 text-[0.8125rem] font-medium text-white/85 backdrop-blur-xl">
              Tap to cancel
            </span>
          </button>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.08] text-white/70">
              <CameraIcon className="h-7 w-7" />
            </span>
            <div className="flex flex-col gap-1.5">
              <p className="text-[1.0625rem] font-semibold text-white">Camera unavailable</p>
              <p className="text-[0.875rem] leading-relaxed text-white/60">{error}</p>
            </div>
            <div className="flex flex-col items-center gap-2.5">
              {onImportRequested && (
                <button
                  type="button"
                  onClick={onImportRequested}
                  className="pressable flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[0.9375rem] font-semibold text-black"
                >
                  <GalleryIcon className="h-[18px] w-[18px]" />
                  Upload from library
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStreamKey((k) => k + 1);
                }}
                className="pressable h-10 rounded-full px-4 text-[0.875rem] font-medium text-white/70"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom deck on solid black: shutter row, then the mode carousel. */}
      <div className="relative flex-shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6">
          <div className="flex justify-center">
            {hasSession ? (
              <DeckButton label="Discard" onClick={() => {
                if (isRecording) pauseSegment();
                setIsDiscardOpen(true);
              }}>
                <TrashIcon className="h-[22px] w-[22px]" />
              </DeckButton>
            ) : (
              onImportRequested && (
                <DeckButton label="Upload" onClick={onImportRequested}>
                  <GalleryIcon className="h-[22px] w-[22px]" />
                </DeckButton>
              )
            )}
          </div>

          <Shutter
            mode={isPhotoMode ? "photo" : "video"}
            isRecording={isRecording}
            hasSession={hasSession}
            isPressing={isPressing}
            disabled={!!error || isStarting}
            label={
              isPhotoMode
                ? "Take photo"
                : isRecording
                  ? "Pause recording"
                  : hasSession
                    ? "Resume recording"
                    : "Tap or hold to record"
            }
            onPointerDown={handleShutterDown}
            onPointerUp={handleShutterUp}
            onPointerCancel={handleShutterCancel}
          />

          <div className="flex justify-center">
            {hasSession && (
              <button
                type="button"
                onClick={finishRecording}
                disabled={elapsedMs < 500}
                aria-label="Done recording"
                className="pressable flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_24px_-10px_rgb(255_68_51/0.8)] disabled:opacity-40"
              >
                <CheckIcon className="h-6 w-6" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {recordError && (
          <div className="animate-rise-in absolute inset-x-4 bottom-full mb-3">
            <button
              type="button"
              onClick={() => setRecordError(null)}
              className="w-full rounded-[16px] bg-[#2a1210]/95 px-4 py-3 text-left text-[0.8125rem] leading-snug text-[#ffb4a8] ring-1 ring-accent/30 backdrop-blur-xl"
            >
              {recordError}
            </button>
          </div>
        )}

        <div className="mt-4 h-5 text-center">
          {hint && (
            <p key={hint} className="animate-fade-in text-[0.75rem] font-medium text-white/50">
              {hint}
            </p>
          )}
        </div>

        <div
          className={`relative mt-2 h-8 overflow-hidden transition-opacity duration-300 ${
            hasSession || error ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="absolute left-0 top-0 flex items-center gap-7 whitespace-nowrap transition-transform duration-[380ms] ease-[var(--ease-ios)]"
            style={{ transform: `translateX(${modeShift}px)` }}
          >
            {CAPTURE_MODES.map((m, i) => {
              const active = m.id === mode;
              return (
                <button
                  key={m.id}
                  ref={(el) => {
                    modeRefs.current[i] = el;
                  }}
                  type="button"
                  onClick={() => chooseMode(m.id)}
                  aria-pressed={active}
                  className={`relative py-1.5 text-[0.875rem] font-semibold tracking-[-0.01em] transition-colors duration-200 ${
                    active ? "text-white" : "text-white/45"
                  }`}
                >
                  {m.label}
                  <span
                    className={`absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white transition-opacity duration-200 ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isSettingsOpen && !hasSession && (
        <StudioSheet title="Camera" onClose={() => setIsSettingsOpen(false)}>
          <div className="flex flex-col gap-6 pb-2">
            <CameraSetting
              label="Quality"
              note={resolution === "4k" ? "Most phones can't encode 4K in real time without dropping frames. 720p or 1080p will feel smoother." : undefined}
            >
              <DarkSegments
                options={(Object.keys(RESOLUTION_PRESETS) as ResolutionPreset[]).map((key) => ({
                  key,
                  label: RESOLUTION_PRESETS[key].label,
                }))}
                value={resolution}
                onChange={setResolution}
              />
            </CameraSetting>

            <CameraSetting
              label="Frame rate"
              note={fps === 120 ? "Most phones cap web camera capture around 30–60fps even when 120 is requested. SORZA uses whatever your device delivers." : undefined}
            >
              <DarkSegments
                options={FPS_PRESETS.map((f) => ({ key: f, label: `${f} fps` }))}
                value={fps}
                onChange={setFps}
              />
            </CameraSetting>

            {exposureRange && (
              <CameraSetting
                label="Exposure"
                trailing={
                  <span className="numeral text-[0.875rem] text-white/80">
                    {exposureCompensation > 0 ? "+" : ""}
                    {exposureCompensation.toFixed(1)}
                  </span>
                }
              >
                <input
                  type="range"
                  min={exposureRange.min}
                  max={exposureRange.max}
                  step={exposureRange.step || 0.1}
                  value={exposureCompensation}
                  onChange={(e) => applyExposureCompensation(Number(e.target.value))}
                  aria-label="Exposure"
                  className="w-full accent-white"
                />
              </CameraSetting>
            )}

            {colorTempRange && (
              <CameraSetting
                label="White balance"
                trailing={
                  <button
                    type="button"
                    onClick={() =>
                      whiteBalanceMode === "manual"
                        ? setWhiteBalanceAuto()
                        : setWhiteBalanceManualTemp(
                            colorTemperature ?? Math.round((colorTempRange.min + colorTempRange.max) / 2),
                          )
                    }
                    className="text-[0.875rem] font-semibold text-white"
                  >
                    {whiteBalanceMode === "manual" ? "Auto" : "Manual"}
                  </button>
                }
              >
                {whiteBalanceMode === "manual" && (
                  <>
                    <input
                      type="range"
                      min={colorTempRange.min}
                      max={colorTempRange.max}
                      step={colorTempRange.step || 100}
                      value={colorTemperature ?? colorTempRange.min}
                      onChange={(e) => setWhiteBalanceManualTemp(Number(e.target.value))}
                      aria-label="Color temperature"
                      className="w-full accent-white"
                    />
                    <p className="numeral mt-1 text-center text-[0.8125rem] text-white/70">{colorTemperature}K</p>
                  </>
                )}
              </CameraSetting>
            )}

            {aeAfLockSupported && (
              <div className="overflow-hidden rounded-[16px] bg-white/[0.07]">
                <SwitchRow
                  icon={<LockIcon className="h-[18px] w-[18px]" />}
                  label="Lock focus & exposure"
                  checked={aeAfLocked}
                  onToggle={toggleAeAfLock}
                />
              </div>
            )}
          </div>
        </StudioSheet>
      )}

      {isDiscardOpen && (
        <StudioSheet onClose={() => setIsDiscardOpen(false)}>
          <div className="flex flex-col items-center gap-1.5 pb-1 pt-2 text-center">
            <p className="text-[1.1875rem] font-bold tracking-[-0.02em] text-white">Discard this clip?</p>
            <p className="numeral text-[0.875rem] text-white/55">
              {formatTime(elapsedMs)} recorded. This can&apos;t be undone.
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                discardRecording();
              }}
              className="pressable h-[52px] rounded-full bg-accent text-[1rem] font-semibold text-white"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => {
                discardRecording();
                onClose();
              }}
              className="pressable h-[52px] rounded-full bg-white/[0.08] text-[1rem] font-semibold text-white"
            >
              Discard and close camera
            </button>
            <StudioAction variant="ghost" onClick={() => setIsDiscardOpen(false)}>
              Keep recording
            </StudioAction>
          </div>
        </StudioSheet>
      )}
    </div>
  );
}

/** The shutter, drawn the way every short-video app has taught people to
 * read it: white for a photo, a red disc for a clip, a red rounded square
 * inside a widened ring while recording. */
function Shutter({
  mode,
  isRecording,
  hasSession,
  isPressing,
  disabled,
  label,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}: {
  mode: "photo" | "video";
  isRecording: boolean;
  hasSession: boolean;
  isPressing: boolean;
  disabled: boolean;
  label: string;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}) {
  const inner = isRecording
    ? "h-[30px] w-[30px] rounded-[9px] bg-accent"
    : mode === "photo"
      ? `h-[64px] w-[64px] rounded-full bg-white ${isPressing ? "scale-[0.88]" : ""}`
      : `${hasSession ? "h-[58px] w-[58px]" : "h-[64px] w-[64px]"} rounded-full bg-accent ${isPressing ? "scale-[0.88]" : ""}`;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      aria-label={label}
      className="relative flex h-[96px] w-[96px] items-center justify-center disabled:opacity-40"
      style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
    >
      <span
        aria-hidden
        className={`absolute rounded-full transition-all duration-300 ease-[var(--ease-ios)] ${
          isRecording
            ? "h-[96px] w-[96px] border-[6px] border-white/30"
            : mode === "photo"
              ? "h-[80px] w-[80px] border-[4px] border-white"
              : "h-[80px] w-[80px] border-[4px] border-white/35"
        }`}
      />
      <span aria-hidden className={`relative transition-all duration-300 ease-[var(--ease-ios)] ${inner}`} />
    </button>
  );
}

function RailButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pressable flex w-14 flex-col items-center gap-1 [filter:drop-shadow(0_1px_3px_rgb(0_0_0/0.65))] ${
        active ? "text-[#ffd60a]" : "text-white"
      }`}
    >
      {children}
      <span className="text-[0.625rem] font-semibold tracking-[0.01em]">{label}</span>
    </button>
  );
}

function DeckButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="pressable flex flex-col items-center gap-1.5 text-white">
      <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-white/[0.09] ring-1 ring-white/15">
        {children}
      </span>
      <span className="text-[0.6875rem] font-semibold text-white/80">{label}</span>
    </button>
  );
}

/** The "Add sound" pill across the top — the sound's title once one is
 * picked, with a quiet clear button beside it. */
function SoundPill({
  title,
  onOpen,
  onClear,
}: {
  title: string | null;
  onOpen: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center rounded-full bg-black/40 text-white backdrop-blur-xl">
      <button
        type="button"
        onClick={onOpen}
        className="pressable flex min-w-0 items-center gap-2 py-2 pl-3.5 pr-3.5 text-[0.875rem] font-semibold"
      >
        <MusicIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{title ?? "Add sound"}</span>
      </button>
      {title && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Remove sound"
          className="-ml-1.5 mr-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/70"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** One labelled block in the dark camera settings sheet. */
function CameraSetting({
  label,
  trailing,
  note,
  children,
}: {
  label: string;
  trailing?: React.ReactNode;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="micro-label text-white/50">{label}</p>
        {trailing}
      </div>
      {children}
      {note && <p className="mt-2 px-1 text-[0.8125rem] leading-snug text-white/50">{note}</p>}
    </div>
  );
}

/** A segmented control for the always-dark camera surface (the shared
 * SegmentedControl follows the app theme, which would break here). */
function DarkSegments<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-[13px] bg-white/[0.08] p-[3px]" role="radiogroup">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={String(o.key)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={`min-w-0 flex-1 rounded-[10px] py-2 text-[0.8125rem] transition-colors duration-200 ${
              active ? "bg-white font-semibold text-black" : "font-medium text-white/70"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** An iOS switch row for the dark camera settings sheet. */
function SwitchRow({
  icon,
  label,
  checked,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-white"
    >
      <span className="flex h-6 w-6 items-center justify-center text-white/80">{icon}</span>
      <span className="min-w-0 flex-1 text-[0.9375rem]">{label}</span>
      <span
        className={`relative h-[31px] w-[51px] flex-shrink-0 rounded-full transition-colors duration-300 ${
          checked ? "bg-[#30d158]" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-300 ease-[var(--ease-ios)] ${
            checked ? "translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
