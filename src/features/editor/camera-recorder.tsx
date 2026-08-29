"use client";

import { useEffect, useRef, useState } from "react";
import {
  CameraFlipIcon,
  CloseIcon,
  CameraIcon,
  LockIcon,
  GalleryIcon,
  CheckIcon,
  BoltIcon,
  TimerIcon,
  GridIcon,
  SettingsIcon,
} from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

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

const COUNTDOWN_OPTIONS = [0, 3, 10] as const;
const DURATION_OPTIONS: { seconds: number; label: string }[] = [
  { seconds: 15, label: "15s" },
  { seconds: 60, label: "60s" },
  { seconds: 180, label: "3m" },
];

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
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

/** Scales target bitrate to the actual capture resolution and frame rate
 * — both now user-selectable (see the Settings panel), defaulting to
 * 720p/60fps: chosen so the default per-second workload (pixels drawn/
 * encoded per second) comes out roughly the same or lower than the old
 * fixed 1080p/30fps (1280×720×60 ≈ 1920×1080×30), while frame rate — the
 * thing that actually reads as "smooth" motion — doubles. 4K and 120fps
 * are offered as explicit opt-ins, not the default, because they trade
 * that smoothness away: higher resolution/frame rate is strictly more
 * pixels to draw and encode per second, which is what caused dropped
 * frames and blocky playback the last time this app tried 4K. The
 * in-app copy next to those options says so rather than hiding the
 * trade-off. */
function pickVideoBitsPerSecond(width: number, height: number, fps: number): number {
  const pixels = width * height;
  const bitsPerSecond = Math.round(pixels * 0.14 * fps);
  return Math.min(Math.max(bitsPerSecond, 4_000_000), 24_000_000);
}

const DEFAULT_MAX_SECONDS = 180;
/** Below this hold duration, a shutter press is a photo; at or past it,
 * it's a video recording — the standard Instagram/Snapchat gesture, so
 * there's no separate photo/video mode to pick before you even shoot. */
const HOLD_THRESHOLD_MS = 300;
/** How far right the shutter has to be dragged, in pixels, while
 * recording before it locks — past this the finger can lift and
 * recording keeps going until a subsequent tap stops it. */
const LOCK_DRAG_PX = 80;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const TAP_MAX_MOVE_PX = 12;
const TAP_MAX_MS = 300;

export function CameraRecorder({
  onCaptured,
  onClose,
  onImportRequested,
}: {
  onCaptured: (file: File, kind: "photo" | "video") => void;
  onClose: () => void;
  /** Opens the device's own photo/video picker — the small library
   * shortcut button next to the shutter. Optional: a bare camera with no
   * import path is still a valid use of this component. */
  onImportRequested?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const gestureConsumedRef = useRef(false);
  const zoomRef = useRef(1);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const focusHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<(typeof COUNTDOWN_OPTIONS)[number]>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [maxSeconds, setMaxSeconds] = useState(DEFAULT_MAX_SECONDS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resolution, setResolution] = useState<ResolutionPreset>(DEFAULT_RESOLUTION);
  const [fps, setFps] = useState<FpsPreset>(DEFAULT_FPS);
  const [exposureRange, setExposureRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [exposureCompensation, setExposureCompensation] = useState(0);
  const [colorTempRange, setColorTempRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [whiteBalanceMode, setWhiteBalanceMode] = useState<"continuous" | "manual">("continuous");
  const [colorTemperature, setColorTemperature] = useState<number | null>(null);
  const [aeAfLockSupported, setAeAfLockSupported] = useState(false);
  const [aeAfLocked, setAeAfLocked] = useState(false);
  // True from the first segment's start until "Finished" is tapped — a
  // multi-clip recording (Instagram/TikTok-style): record a bit, pause,
  // record more, pause again, as many times as wanted, then finish. One
  // continuous MediaRecorder session underneath via pause()/resume(),
  // which produces a single valid combined file when eventually stopped
  // — far more robust than recording separate clips and trying to
  // concatenate compressed video files after the fact, which generally
  // doesn't produce a valid file for the containers used here.
  const [hasSession, setHasSession] = useState(false);
  // Drag-to-lock only applies to the very first segment's hold — every
  // segment after that is a plain tap to pause/resume, so there's no
  // hold gesture left to lock in the first place.
  const [isFirstSegment, setIsFirstSegment] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomHintVisible, setZoomHintVisible] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; id: number } | null>(null);
  const [captureFlash, setCaptureFlash] = useState(false);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Your browser doesn't support in-app camera capture.");
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
            // than failing outright. Both are user-selectable from the
            // Settings panel now; see pickVideoBitsPerSecond above for
            // why 720p/60fps is the default rather than the ceiling.
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
        // new stream's track is a fresh object with its own capabilities
        // that may not match the old one's.
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
          "Couldn't access your camera. Check that REVV has camera and microphone permission in your device settings.",
        );
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, resolution, fps]);

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
    // requestAnimationFrame runs at the display's own refresh rate
    // (60-120Hz on a real phone) — drawing a full frame that often is
    // wasted work for what's ultimately captured at the chosen fps
    // (canvas.captureStream(fps) in startRecording below), and contends
    // with the recorder for the same CPU budget. Throttling the actual
    // draw to match leaves more headroom for encoding to keep up.
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
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [facingMode, fps]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (focusHideTimerRef.current) clearTimeout(focusHideTimerRef.current);
      if (zoomHintTimerRef.current) clearTimeout(zoomHintTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
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
  // control on an already-feature-detected capability, not something
  // that needs the same "don't lie about the resulting state" treatment
  // as a discrete on/off toggle like torch.
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
      // Device advertised manual focus/exposure mode but rejected the
      // constraint — leave the toggle in its previous state, same
      // reasoning as toggleTorch.
    }
  }

  // Self-timer: delays a photo or the start of a recording by the chosen
  // number of seconds, showing a countdown overlay. Only ever wraps the
  // gesture that starts something new (a fresh photo tap, or the very
  // first hold-to-record) — never a mid-session pause/resume tap, which
  // would be a jarring few-second delay every single time you wanted to
  // resume.
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
    // A brief white flash is the one universal "the photo was just taken"
    // signal every real camera app gives — purely a CSS overlay, doesn't
    // touch the actual capture below at all.
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 150);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCaptured(new File([blob], "photo.jpg", { type: "image/jpeg" }), "photo");
      },
      "image/jpeg",
      0.95,
    );
  }

  function startRecording() {
    const stream = streamRef.current;
    const canvas = canvasRef.current;
    if (!stream || !canvas) return;

    const canvasStream = canvas.captureStream(fps);

    // Feeding the mic's own MediaStreamTrack straight into a MediaStream
    // built alongside an unrelated canvas video track is a known WebKit
    // (WKWebView, i.e. the iOS app) combination that records video-only —
    // the track is live and already driving the muted preview <video>
    // fine, but WKWebView's MediaRecorder silently fails to encode audio
    // that didn't originate from the same capture session as the video
    // track it's paired with. Routing it through a real Web Audio graph
    // first and recording *that* destination's track instead is the
    // standard workaround, and the same technique use-video-export.ts
    // already relies on for its own audio mixing.
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
    const mimeType = pickVideoMimeType();
    const baseType = mimeType.split(";")[0];
    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: pickVideoBitsPerSecond(canvas.width, canvas.height, fps),
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      combined.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      const blob = new Blob(chunksRef.current, { type: baseType });
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      onCaptured(new File([blob], `recording.${extension}`, { type: baseType }), "video");
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
    setHasSession(true);
    setIsLocked(false);
    setDragOffset(0);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= maxSeconds) finishRecording();
        return s + 1;
      });
    }, 1000);
  }

  function pauseSegment() {
    if (recorderRef.current?.state === "recording") recorderRef.current.pause();
    setIsRecording(false);
    setIsFirstSegment(false);
    setIsLocked(false);
    setDragOffset(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function resumeSegment() {
    if (recorderRef.current?.state === "paused") recorderRef.current.resume();
    setIsRecording(true);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= maxSeconds) finishRecording();
        return s + 1;
      });
    }, 1000);
  }

  function finishRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
    setHasSession(false);
    setIsFirstSegment(true);
    setIsLocked(false);
    setDragOffset(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleShutterDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (error || countdown !== null) return;
    if (hasSession) {
      // Once a session exists, a fresh press only happens after the
      // finger has lifted from a locked first-segment hold — the
      // remaining "press again to pause" case for that segment. Resuming
      // a paused segment is handled as a plain tap on release instead
      // (see handleShutterUp) — no hold/lock gesture on later segments.
      if (isRecording && isLocked) {
        pauseSegment();
        // Without this, the pointerup that ends this same tap would see
        // hasSession && !isRecording (now true, since pause just fired
        // synchronously above) and immediately resume again — a single
        // tap silently pausing and un-pausing in one motion instead of
        // just pausing.
        gestureConsumedRef.current = true;
      }
      return;
    }
    dragStartXRef.current = e.clientX;
    // Keeps receiving move/up events for this touch even once the
    // finger drags outside the button's bounds — required for the
    // drag-to-lock gesture to track all the way to the lock target.
    e.currentTarget.setPointerCapture(e.pointerId);
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      runWithCountdown(startRecording);
    }, HOLD_THRESHOLD_MS);
  }

  function handleShutterMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isRecording || isLocked || !isFirstSegment || dragStartXRef.current == null) return;
    const dx = e.clientX - dragStartXRef.current;
    const clamped = Math.min(Math.max(dx, 0), LOCK_DRAG_PX);
    setDragOffset(clamped);
    if (dx >= LOCK_DRAG_PX) setIsLocked(true);
  }

  function handleShutterUp() {
    if (gestureConsumedRef.current) {
      gestureConsumedRef.current = false;
      return;
    }
    if (countdown !== null) return;
    if (hasSession && !isRecording) {
      // Tapped while paused between segments — resume.
      resumeSegment();
      return;
    }
    if (holdTimerRef.current) {
      // Released before the hold threshold — a tap, not a hold.
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      dragStartXRef.current = null;
      runWithCountdown(capturePhoto);
      return;
    }
    dragStartXRef.current = null;
    // A locked first segment ignores release — it only pauses on the
    // next tap (handled in handleShutterDown above).
    if (isRecording && !isLocked) pauseSegment();
  }

  // Pinch-to-zoom and tap-to-focus share the same pointer stream on the
  // viewfinder canvas: one finger that stays put is a focus tap, two
  // fingers moving apart or together is a pinch.
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
      setZoomHintVisible(true);
      if (zoomHintTimerRef.current) clearTimeout(zoomHintTimerRef.current);
      zoomHintTimerRef.current = setTimeout(() => setZoomHintVisible(false), 900);
    }
  }

  function handleViewfinderUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const start = tapStartRef.current;
    const wasTap =
      pointersRef.current.size === 1 &&
      !!start &&
      Date.now() - start.time < TAP_MAX_MS &&
      Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP_MAX_MOVE_PX;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) tapStartRef.current = null;
    if (wasTap) focusAt(e);
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
    // reticle above shows regardless, since continuous autofocus means
    // the camera is very likely already sharp there even when this isn't
    // supported, but only this call can actually redirect the sensor's
    // focus point on devices that do support it.
    const track = streamRef.current?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.();
    if (!track || !capabilities?.pointsOfInterest) return;
    // The camera's own coordinate space isn't mirrored even when the
    // preview is (front camera) — flip x back before handing it off.
    const nx = facingMode === "user" ? 1 - px / rect.width : px / rect.width;
    const ny = py / rect.height;
    track.applyConstraints({ advanced: [{ pointsOfInterest: [{ x: nx, y: ny }] }] }).catch(() => {});
  }

  function formatTime(total: number) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const recordProgress = Math.min(1, seconds / maxSeconds);
  const ringCircumference = 2 * Math.PI * 36;

  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-black">
      {/* Real (if off-screen) size on purpose, not `display:none` (Tailwind's
          `hidden`) — WebKit/iOS Safari is documented to stop decoding a
          `display:none` <video> entirely. This element is the actual
          source the canvas below draws from every frame; if it stalls,
          the canvas just keeps redrawing the same first frame forever.
          That fits exactly what was reported: a photo (one snapshot of
          whatever's currently on the canvas) still comes out fine even
          off a frozen frame, but a recording — the canvas captured over
          time — is static the whole way through. Positioning off-screen
          with a real, unclipped size keeps decoding genuinely live. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="fixed left-[-9999px] top-0 h-40 w-40"
      />
      <canvas
        ref={canvasRef}
        onPointerDown={handleViewfinderDown}
        onPointerMove={handleViewfinderMove}
        onPointerUp={handleViewfinderUp}
        onPointerCancel={handleViewfinderUp}
        className="absolute inset-0 h-full w-full touch-none object-cover"
      />

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-[6] bg-white transition-opacity duration-150 ${
          captureFlash ? "opacity-80" : "opacity-0"
        }`}
      />

      {/* Targeting-frame corners — purely decorative, reads as a precision
          instrument rather than a plain video feed. Kept clear of the
          header/shutter regions so it never competes with real controls. */}
      <div
        className="pointer-events-none absolute inset-x-5 z-[5]"
        style={{
          top: "calc(4.75rem + env(safe-area-inset-top))",
          bottom: "calc(7.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-white/25" />
        <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-white/25" />
        <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-white/25" />
        <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-white/25" />
      </div>

      {gridEnabled && (
        <div className="pointer-events-none absolute inset-0 z-[4]">
          <span className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
          <span className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
          <span className="absolute top-1/3 left-0 h-px w-full bg-white/25" />
          <span className="absolute top-2/3 left-0 h-px w-full bg-white/25" />
        </div>
      )}

      {countdown !== null && (
        <button
          type="button"
          onClick={cancelCountdown}
          aria-label="Cancel countdown"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/40"
        >
          <span
            key={countdown}
            className="animate-countdown-pulse font-mono text-7xl font-bold text-white"
          >
            {countdown}
          </span>
          <span className="glass rounded-full px-3 py-1 text-xs text-white/70">Tap to cancel</span>
        </button>
      )}

      {zoomHintVisible && (
        <div className="pointer-events-none absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2.5">
          <div className="glass relative h-36 w-[3px] rounded-full">
            <span
              className="absolute left-1/2 h-3 w-3 rounded-full bg-accent"
              style={{
                bottom: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%`,
                transform: "translate(-50%, 50%)",
              }}
            />
          </div>
          <span className="glass rounded-full px-2.5 py-1 font-mono text-xs tabular-nums text-white">
            {zoom.toFixed(1)}×
          </span>
        </div>
      )}

      {focusPoint && (
        <span
          key={focusPoint.id}
          className="animate-focus-ring text-accent pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: focusPoint.x, top: focusPoint.y }}
        >
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path
              d="M4 15V6a2 2 0 0 1 2-2h9M56 15V6a2 2 0 0 0-2-2h-9M4 45v9a2 2 0 0 0 2 2h9M56 45v9a2 2 0 0 1-2 2h-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      )}

      <div className="relative z-10 flex items-center justify-between px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-white"
        >
          <CloseIcon className="h-[18px] w-[18px]" />
        </button>
        {isRecording ? (
          <span className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-xs tracking-wider text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            REC {formatTime(seconds)}
            {isLocked && <LockIcon className="h-3.5 w-3.5 text-white/60" />}
          </span>
        ) : hasSession ? (
          <span className="glass rounded-full px-3.5 py-1.5 font-mono text-xs tracking-wider text-white/70">
            Paused {formatTime(seconds)} · tap to resume
          </span>
        ) : (
          !error && (
            <span className="glass rounded-full px-3.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-white/60">
              Tap · Hold · Pinch
            </span>
          )
        )}
        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          disabled={hasSession}
          aria-label="Flip camera"
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-white disabled:opacity-40"
        >
          <CameraFlipIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      {!hasSession && !error && (
        <div className="relative z-10 flex items-center justify-center gap-2 px-4 pb-2">
          {torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torchOn ? "Turn off flash" : "Turn on flash"}
              className={`glass flex h-8 w-8 items-center justify-center rounded-full ${
                torchOn ? "bg-accent text-accent-foreground" : "text-white"
              }`}
            >
              <BoltIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Camera settings"
            className="glass flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-white"
          >
            <SettingsIcon className="h-4 w-4" />
            Settings
          </button>
        </div>
      )}

      {isSettingsOpen && !hasSession && !error && (
        <div
          className="absolute inset-0 z-30 flex flex-col justify-end bg-black/60"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-raised max-h-[75vh] overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto -mt-1 mb-4 h-1 w-10 rounded-full bg-white/15" />
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Camera settings</h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close settings"
                className="flex h-7 w-7 items-center justify-center rounded-full text-white/60"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Quality</p>
                <div className="flex gap-2">
                  {(Object.keys(RESOLUTION_PRESETS) as ResolutionPreset[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setResolution(key)}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                        resolution === key ? "bg-accent text-accent-foreground" : "bg-white/10 text-white"
                      }`}
                    >
                      {RESOLUTION_PRESETS[key].label}
                    </button>
                  ))}
                </div>
                {resolution === "4k" && (
                  <p className="mt-1.5 text-xs text-white/50">
                    4K asks for real recording quality most phones can&apos;t encode in real time
                    without dropping frames — 720p or 1080p will feel smoother.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">Frame rate</p>
                <div className="flex gap-2">
                  {FPS_PRESETS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFps(f)}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                        fps === f ? "bg-accent text-accent-foreground" : "bg-white/10 text-white"
                      }`}
                    >
                      {f} fps
                    </button>
                  ))}
                </div>
                {fps === 120 && (
                  <p className="mt-1.5 text-xs text-white/50">
                    Most phones cap real capture around 30-60fps through the web camera even when
                    120 is requested — REVV will use whatever your device actually delivers.
                  </p>
                )}
              </div>

              {exposureRange && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Exposure</p>
                    <span className="font-mono text-xs text-white/70">
                      {exposureCompensation > 0 ? "+" : ""}
                      {exposureCompensation.toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={exposureRange.min}
                    max={exposureRange.max}
                    step={exposureRange.step || 0.1}
                    value={exposureCompensation}
                    onChange={(e) => applyExposureCompensation(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}

              {colorTempRange && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      White balance
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        whiteBalanceMode === "manual"
                          ? setWhiteBalanceAuto()
                          : setWhiteBalanceManualTemp(
                              colorTemperature ?? Math.round((colorTempRange.min + colorTempRange.max) / 2),
                            )
                      }
                      className="text-xs text-accent"
                    >
                      {whiteBalanceMode === "manual" ? "Switch to auto" : "Set manually"}
                    </button>
                  </div>
                  {whiteBalanceMode === "manual" && (
                    <>
                      <input
                        type="range"
                        min={colorTempRange.min}
                        max={colorTempRange.max}
                        step={colorTempRange.step || 100}
                        value={colorTemperature ?? colorTempRange.min}
                        onChange={(e) => setWhiteBalanceManualTemp(Number(e.target.value))}
                        className="w-full"
                      />
                      <p className="mt-1 text-center font-mono text-xs text-white/70">{colorTemperature}K</p>
                    </>
                  )}
                </div>
              )}

              {aeAfLockSupported && (
                <button
                  type="button"
                  onClick={toggleAeAfLock}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${
                    aeAfLocked ? "bg-accent text-accent-foreground" : "bg-white/10 text-white"
                  }`}
                >
                  <span>Lock focus &amp; exposure</span>
                  {aeAfLocked && <LockIcon className="h-4 w-4" />}
                </button>
              )}

              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
                  <TimerIcon className="h-3.5 w-3.5" />
                  Self-timer
                </p>
                <div className="flex gap-2">
                  {COUNTDOWN_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCountdownSeconds(s)}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                        countdownSeconds === s ? "bg-accent text-accent-foreground" : "bg-white/10 text-white"
                      }`}
                    >
                      {s === 0 ? "Off" : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGridEnabled((g) => !g)}
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white"
              >
                <span className="flex items-center gap-2">
                  <GridIcon className="h-4 w-4" />
                  Grid
                </span>
                <span
                  className={`block h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                    gridEnabled ? "bg-accent" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
                      gridEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
                  Max clip length
                </p>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.seconds}
                      type="button"
                      onClick={() => setMaxSeconds(d.seconds)}
                      className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                        maxSeconds === d.seconds ? "bg-accent text-accent-foreground" : "bg-white/10 text-white"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="glass flex h-14 w-14 items-center justify-center rounded-full text-white/60">
            <CameraIcon className="h-7 w-7" />
          </span>
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-center pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {hasSession ? (
          <button
            type="button"
            onClick={finishRecording}
            aria-label="Finish recording"
            className="absolute right-6 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg"
          >
            <CheckIcon className="h-5 w-5" />
          </button>
        ) : (
          onImportRequested &&
          !isRecording && (
            <button
              type="button"
              onClick={onImportRequested}
              aria-label="Choose from your library"
              className="glass absolute right-6 flex h-11 w-11 items-center justify-center rounded-xl text-white"
            >
              <GalleryIcon className="h-5 w-5" />
            </button>
          )
        )}
        {isRecording && !isLocked && isFirstSegment && (
          <div className="glass pointer-events-none absolute bottom-full left-1/2 mb-5 flex h-11 w-[140px] -translate-x-1/2 items-center rounded-full">
            <LockIcon className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <span
              className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg"
              style={{ transform: `translate(${8 + dragOffset}px, 0)` }}
            >
              <CameraIcon className="h-4 w-4" />
            </span>
          </div>
        )}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <svg viewBox="0 0 80 80" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            {isRecording && (
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringCircumference * (1 - recordProgress)}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            )}
          </svg>
          <button
            type="button"
            onPointerDown={handleShutterDown}
            onPointerMove={handleShutterMove}
            onPointerUp={handleShutterUp}
            onPointerCancel={() => {
              if (holdTimerRef.current) {
                clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
              }
              dragStartXRef.current = null;
              if (isRecording && !isLocked) pauseSegment();
            }}
            disabled={!!error}
            aria-label={isLocked ? "Pause recording" : "Tap for photo, hold for video"}
            className="relative z-10 flex h-[68px] w-[68px] select-none items-center justify-center rounded-full border-2 border-white/70 disabled:opacity-40"
            style={{
              touchAction: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
            }}
          >
            <span
              className={`bg-accent transition-all ${
                isRecording ? "h-6 w-6 rounded-md" : "h-[52px] w-[52px] rounded-full"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
