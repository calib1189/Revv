"use client";

import { useEffect, useRef, useState } from "react";
import { CameraFlipIcon, CloseIcon, CameraIcon, LockIcon } from "@/components/ui/icons";
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
}: {
  onCaptured: (file: File, kind: "photo" | "video") => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const zoomRef = useRef(1);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const focusHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoomHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
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
    function draw() {
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
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setIsLocked(false);
    setDragOffset(0);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_RECORD_SECONDS) stopRecording();
        return s + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
    setIsLocked(false);
    setDragOffset(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleShutterDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (error) return;
    if (isRecording) {
      // A fresh press while already recording only happens once the
      // finger has lifted after locking — that's the "press again to
      // stop" gesture.
      if (isLocked) stopRecording();
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
    if (!isRecording || isLocked || dragStartXRef.current == null) return;
    const dx = e.clientX - dragStartXRef.current;
    const clamped = Math.min(Math.max(dx, 0), LOCK_DRAG_PX);
    setDragOffset(clamped);
    if (dx >= LOCK_DRAG_PX) setIsLocked(true);
  }

  function handleShutterUp() {
    if (holdTimerRef.current) {
      // Released before the hold threshold — a tap, not a hold.
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      dragStartXRef.current = null;
      capturePhoto();
      return;
    }
    dragStartXRef.current = null;
    // Locked recordings ignore release — they only stop on the next tap.
    if (isRecording && !isLocked) stopRecording();
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

  return (
    <div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-black">
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      <canvas
        ref={canvasRef}
        onPointerDown={handleViewfinderDown}
        onPointerMove={handleViewfinderMove}
        onPointerUp={handleViewfinderUp}
        onPointerCancel={handleViewfinderUp}
        className="absolute inset-0 h-full w-full touch-none object-cover"
      />

      {zoomHintVisible && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-1.5 text-sm font-semibold text-white">
          {zoom.toFixed(1)}x
        </span>
      )}

      {focusPoint && (
        <span
          key={focusPoint.id}
          className="animate-focus-ring pointer-events-none absolute z-10 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-white"
          style={{ left: focusPoint.x, top: focusPoint.y }}
        />
      )}

      <div className="relative z-10 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        {isRecording ? (
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {formatTime(seconds)}
            {isLocked && (
              <>
                <LockIcon className="ml-0.5 h-3.5 w-3.5 text-white/70" />
                <span className="text-xs font-normal text-white/60">tap to stop</span>
              </>
            )}
          </span>
        ) : (
          !error && (
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white/70">
              Tap for photo · hold for video · pinch to zoom
            </span>
          )
        )}
        <button
          type="button"
          onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
          disabled={isRecording}
          aria-label="Flip camera"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-40"
        >
          <CameraFlipIcon className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white/60">
            <CameraIcon className="h-7 w-7" />
          </span>
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-center pb-[calc(2rem+env(safe-area-inset-bottom))]">
        {isRecording && !isLocked && (
          <div className="pointer-events-none absolute bottom-full left-1/2 mb-4 h-12 w-[136px] -translate-x-1/2 rounded-full bg-black/40">
            <LockIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
            <span
              className="absolute top-1/2 left-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow"
              style={{ transform: `translate(${dragOffset}px, -50%)` }}
            >
              <CameraIcon className="h-4 w-4" />
            </span>
          </div>
        )}
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
            if (isRecording && !isLocked) stopRecording();
          }}
          disabled={!!error}
          aria-label={isLocked ? "Stop recording" : "Tap for photo, hold for video"}
          className="relative z-10 flex h-20 w-20 select-none items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
          style={{
            touchAction: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          <span
            className={`bg-accent transition-all ${
              isRecording ? "h-7 w-7 rounded-md" : "h-16 w-16 rounded-full"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
