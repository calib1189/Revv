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
          "Couldn't access your camera. Check that SORZA has camera and microphone permission in your device settings.",
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
  const ringCircumference = 2 * Math.PI * 38;

  // The camera is always a dark surface regardless of app theme, so its
  // chrome uses fixed dark-glass values rather than the theme tokens —
  // the settings sheet previously used .glass-raised (theme-following)
  // with white text, which went white-on-white in light mode.
  const chromeButton =
    "pressable flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xl disabled:opacity-40";

  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-black">
      {/* Real (if off-screen) size on purpose, not `display:none` (Tailwind's
          `hidden`) — WebKit/iOS Safari is documented to stop decoding a
          `display:none` <video> entirely. This element is the actual
          source the canvas below draws from every frame; if it stalls,
          the canvas just keeps redrawing the same first frame forever.
          Positioning off-screen with a real, unclipped size keeps
          decoding genuinely live. */}
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

      {/* Soft scrims top and bottom so white controls stay legible over
          any scene, without boxing the viewfinder in. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-36 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-64 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-[6] bg-white transition-opacity duration-150 ${
          captureFlash ? "opacity-80" : "opacity-0"
        }`}
      />

      {gridEnabled && (
        <div className="pointer-events-none absolute inset-0 z-[4]">
          <span className="absolute left-1/3 top-0 h-full w-px bg-white/30" />
          <span className="absolute left-2/3 top-0 h-full w-px bg-white/30" />
          <span className="absolute left-0 top-1/3 h-px w-full bg-white/30" />
          <span className="absolute left-0 top-2/3 h-px w-full bg-white/30" />
        </div>
      )}

      {countdown !== null && (
        <button
          type="button"
          onClick={cancelCountdown}
          aria-label="Cancel countdown"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/35"
        >
          <span key={countdown} className="animate-countdown-pulse numeral text-[7rem] leading-none text-white drop-shadow-lg">
            {countdown}
          </span>
          <span className="rounded-full bg-black/45 px-3.5 py-1.5 text-[0.8125rem] font-medium text-white/80 backdrop-blur-xl">
            Tap to cancel
          </span>
        </button>
      )}

      {zoomHintVisible && (
        <div className="pointer-events-none absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-2.5">
          <div className="relative h-36 w-[3px] rounded-full bg-white/25">
            <span
              className="absolute left-1/2 h-3.5 w-3.5 rounded-full bg-[#ffd60a] shadow"
              style={{
                bottom: `${((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100}%`,
                transform: "translate(-50%, 50%)",
              }}
            />
          </div>
          <span className="numeral rounded-full bg-black/50 px-2.5 py-1 text-[0.8125rem] text-[#ffd60a] backdrop-blur-xl">
            {zoom.toFixed(1)}×
          </span>
        </div>
      )}

      {focusPoint && (
        <span
          key={focusPoint.id}
          className="animate-focus-ring pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 text-[#ffd60a]"
          style={{ left: focusPoint.x, top: focusPoint.y }}
        >
          {/* The Camera app's square focus box, in its yellow. */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <rect x="2" y="2" width="68" height="68" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M36 2v6M36 64v6M2 36h6M64 36h6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
      )}

      {/* Top bar: close, status, and the two quick toggles. */}
      <div className="relative z-10 grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 pb-3 pt-[calc(0.875rem+env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Close camera" className={chromeButton}>
          <CloseIcon className="h-[18px] w-[18px]" />
        </button>

        <div className="flex justify-center">
          {isRecording ? (
            <span className="numeral flex items-center gap-1.5 rounded-[8px] bg-[#ff3b30] px-2.5 py-1 text-[0.9375rem] text-white">
              {formatTime(seconds)}
              {isLocked && <LockIcon className="h-3.5 w-3.5 text-white/85" />}
            </span>
          ) : hasSession ? (
            <span className="rounded-full bg-black/45 px-3 py-1 text-[0.8125rem] font-medium text-white/85 backdrop-blur-xl">
              Paused · <span className="numeral">{formatTime(seconds)}</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {!hasSession && !error && torchSupported && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-label={torchOn ? "Turn off flash" : "Turn on flash"}
              aria-pressed={torchOn}
              className={`pressable flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl ${
                torchOn ? "bg-[#ffd60a] text-black" : "bg-black/40 text-white"
              }`}
            >
              <BoltIcon className="h-[18px] w-[18px]" />
            </button>
          )}
          {!hasSession && !error && (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Camera settings"
              className={chromeButton}
            >
              <SettingsIcon className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>
      </div>

      {isSettingsOpen && !hasSession && !error && (
        <div
          className="animate-fade-in absolute inset-0 z-30 flex flex-col justify-end bg-black/55"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-sheet-up max-h-[78vh] overflow-y-auto rounded-t-[28px] bg-[#1c1c1e]/95 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2.5 text-white backdrop-blur-2xl"
          >
            <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-white/25" />
            <div className="mb-5 flex items-center justify-between px-1">
              <h2 className="text-[1.25rem] font-bold tracking-[-0.02em]">Camera</h2>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-[0.9375rem] font-semibold text-[#ffd60a]"
              >
                Done
              </button>
            </div>

            <div className="flex flex-col gap-6">
              <CameraSetting label="Quality" note={resolution === "4k" ? "Most phones can't encode 4K in real time without dropping frames. 720p or 1080p will feel smoother." : undefined}>
                <DarkSegments
                  options={(Object.keys(RESOLUTION_PRESETS) as ResolutionPreset[]).map((key) => ({
                    key,
                    label: RESOLUTION_PRESETS[key].label,
                  }))}
                  value={resolution}
                  onChange={setResolution}
                />
              </CameraSetting>

              <CameraSetting label="Frame rate" note={fps === 120 ? "Most phones cap web camera capture around 30–60fps even when 120 is requested. SORZA uses whatever your device delivers." : undefined}>
                <DarkSegments
                  options={FPS_PRESETS.map((f) => ({ key: f, label: `${f} fps` }))}
                  value={fps}
                  onChange={setFps}
                />
              </CameraSetting>

              <CameraSetting label="Self-timer">
                <DarkSegments
                  options={COUNTDOWN_OPTIONS.map((s) => ({ key: s, label: s === 0 ? "Off" : `${s}s` }))}
                  value={countdownSeconds}
                  onChange={setCountdownSeconds}
                />
              </CameraSetting>

              <CameraSetting label="Max clip length">
                <DarkSegments
                  options={DURATION_OPTIONS.map((d) => ({ key: d.seconds, label: d.label }))}
                  value={maxSeconds}
                  onChange={setMaxSeconds}
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
                    className="w-full accent-[#ffd60a]"
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
                      className="text-[0.875rem] font-semibold text-[#ffd60a]"
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
                        className="w-full accent-[#ffd60a]"
                      />
                      <p className="numeral mt-1 text-center text-[0.8125rem] text-white/70">{colorTemperature}K</p>
                    </>
                  )}
                </CameraSetting>
              )}

              <div className="overflow-hidden rounded-[16px] bg-white/[0.08]">
                <SwitchRow
                  icon={<GridIcon className="h-[18px] w-[18px]" />}
                  label="Grid"
                  checked={gridEnabled}
                  onToggle={() => setGridEnabled((g) => !g)}
                />
                {aeAfLockSupported && (
                  <div className="relative">
                    <span className="absolute left-[3.25rem] right-0 top-0 h-px bg-white/10" />
                    <SwitchRow
                      icon={<LockIcon className="h-[18px] w-[18px]" />}
                      label="Lock focus & exposure"
                      checked={aeAfLocked}
                      onToggle={toggleAeAfLock}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white/70">
            <CameraIcon className="h-7 w-7" />
          </span>
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      {/* Bottom bar: library · shutter · flip (or finish while a
          recording session is open), with the gesture hint beneath. */}
      <div className="relative z-10 mt-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {isRecording && !isLocked && isFirstSegment && (
          <div className="pointer-events-none mx-auto mb-5 flex h-11 w-[150px] items-center rounded-full bg-black/45 backdrop-blur-xl">
            <span className="absolute left-1/2 -translate-x-1/2 text-[0.6875rem] font-semibold uppercase tracking-wide text-white/45">
              Slide to lock
            </span>
            <LockIcon className="absolute right-3.5 h-4 w-4 text-white/60" />
            <span
              className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-[#ff3b30] text-white shadow-lg"
              style={{ transform: `translate(${4 + dragOffset}px, 0)` }}
            >
              <CameraIcon className="h-4 w-4" />
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 items-center px-8">
          <div className="flex justify-start">
            {onImportRequested && !hasSession && !isRecording && (
              <button
                type="button"
                onClick={onImportRequested}
                aria-label="Choose from your library"
                className="pressable flex h-12 w-12 items-center justify-center rounded-[12px] bg-white/15 text-white ring-2 ring-white/70 backdrop-blur-xl"
              >
                <GalleryIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex justify-center">
            <div className="relative flex h-[84px] w-[84px] items-center justify-center">
              <svg viewBox="0 0 84 84" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90">
                <circle cx="42" cy="42" r="38" fill="none" stroke="white" strokeWidth="4.5" />
                {isRecording && (
                  <circle
                    cx="42"
                    cy="42"
                    r="38"
                    fill="none"
                    stroke="#ff3b30"
                    strokeWidth="4.5"
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
                className="relative z-10 flex h-[68px] w-[68px] select-none items-center justify-center rounded-full disabled:opacity-40"
                style={{
                  touchAction: "none",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                }}
              >
                <span
                  className={`transition-all duration-300 ease-[var(--ease-ios)] ${
                    isRecording
                      ? "h-7 w-7 rounded-[7px] bg-[#ff3b30]"
                      : hasSession
                        ? "h-[66px] w-[66px] rounded-full bg-[#ff3b30]"
                        : "h-[66px] w-[66px] rounded-full bg-white active:scale-90"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            {hasSession ? (
              <button
                type="button"
                onClick={finishRecording}
                aria-label="Finish recording"
                className="pressable flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd60a] text-black shadow-lg"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
                aria-label="Flip camera"
                className="pressable flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-xl"
              >
                <CameraFlipIcon className="h-[22px] w-[22px]" />
              </button>
            )}
          </div>
        </div>

        {!error && (
          <p className="mt-4 text-center text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[#ffd60a]">
            {isRecording ? "Recording" : hasSession ? "Tap to resume" : "Tap photo · Hold video"}
          </p>
        )}
      </div>
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
        <p className="text-[0.8125rem] font-medium uppercase tracking-wide text-white/55">{label}</p>
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
    <div className="flex rounded-[12px] bg-white/[0.12] p-[3px]" role="radiogroup">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={String(o.key)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={`min-w-0 flex-1 rounded-[9px] py-[7px] text-[0.8125rem] transition-colors duration-200 ${
              active ? "bg-white/30 font-semibold text-white shadow" : "font-medium text-white/70"
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
      className="flex min-h-[50px] w-full items-center gap-3 px-4 text-left"
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
