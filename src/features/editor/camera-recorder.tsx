"use client";

import { useEffect, useRef, useState } from "react";
import { CameraFlipIcon, CloseIcon, CameraIcon, LockIcon, GalleryIcon, CheckIcon } from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

function pickVideoMimeType(): string {
  const candidates = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

/** Scales target bitrate to the actual capture resolution. 1080p is the
 * ceiling this component asks the camera for (see the getUserMedia call
 * below) — going higher (we tried 4K) overloads real-time encoding on
 * mid-range phones, which is what caused dropped frames during recording
 * and blocky, over-compressed-looking playback afterward: the encoder
 * falls behind and has to sacrifice quality to keep up. 1080p at a solid
 * bitrate is what every mainstream social app actually records at for
 * exactly this reason. */
function pickVideoBitsPerSecond(width: number, height: number): number {
  const pixels = width * height;
  const bitsPerSecond = Math.round(pixels * 0.14 * 30);
  return Math.min(Math.max(bitsPerSecond, 4_000_000), 16_000_000);
}

const MAX_RECORD_SECONDS = 180;
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

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            // Soft ("ideal") constraints — the browser picks the closest
            // resolution the camera actually supports rather than failing
            // outright. Capped at 1080p on purpose: see
            // pickVideoBitsPerSecond above for why higher isn't actually
            // better here.
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
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
  }, [facingMode]);

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
    // wasted work for what's ultimately captured at 30fps
    // (canvas.captureStream(30) below), and contends with the recorder
    // for the same CPU budget. Throttling the actual draw to ~30fps
    // leaves more headroom for encoding to keep up, for smoother output.
    const frameIntervalMs = 1000 / 30;
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
  }, [facingMode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (focusHideTimerRef.current) clearTimeout(focusHideTimerRef.current);
      if (zoomHintTimerRef.current) clearTimeout(zoomHintTimerRef.current);
    };
  }, []);

  function capturePhoto() {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width) return;
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

    const canvasStream = canvas.captureStream(30);
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...stream.getAudioTracks(),
    ]);

    chunksRef.current = [];
    const mimeType = pickVideoMimeType();
    const baseType = mimeType.split(";")[0];
    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: pickVideoBitsPerSecond(canvas.width, canvas.height),
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      combined.getTracks().forEach((t) => t.stop());
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
        if (s + 1 >= MAX_RECORD_SECONDS) finishRecording();
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
        if (s + 1 >= MAX_RECORD_SECONDS) finishRecording();
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
    if (error) return;
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
      startRecording();
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
      capturePhoto();
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

  const recordProgress = Math.min(1, seconds / MAX_RECORD_SECONDS);
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
