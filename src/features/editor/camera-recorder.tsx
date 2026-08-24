"use client";

import { useEffect, useRef, useState } from "react";
import { CameraFlipIcon, CloseIcon, CameraIcon } from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

function pickVideoMimeType(): string {
  const candidates = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

const MAX_RECORD_SECONDS = 180;
/** Below this hold duration, a shutter press is a photo; at or past it,
 * it's a video recording — the standard Instagram/Snapchat gesture, so
 * there's no separate photo/video mode to pick before you even shoot. */
const HOLD_THRESHOLD_MS = 300;

export function CameraRecorder({
  onCaptured,
  onClose,
}: {
  onCaptured: (file: File, kind: "photo" | "video") => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          video: { facingMode },
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCaptured(new File([blob], "photo.jpg", { type: "image/jpeg" }), "photo");
      },
      "image/jpeg",
      0.92,
    );
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = pickVideoMimeType();
    const baseType = mimeType.split(";")[0];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: baseType });
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      onCaptured(new File([blob], `recording.${extension}`, { type: baseType }), "video");
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
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
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleShutterDown() {
    if (error || isRecording) return;
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      startRecording();
    }, HOLD_THRESHOLD_MS);
  }

  function handleShutterUp() {
    if (holdTimerRef.current) {
      // Released before the hold threshold — a tap, not a hold.
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
      capturePhoto();
      return;
    }
    if (isRecording) stopRecording();
  }

  function formatTime(total: number) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 h-full w-full object-cover ${
          facingMode === "user" ? "-scale-x-100" : ""
        }`}
      />

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
          </span>
        ) : (
          !error && (
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white/70">
              Tap for photo · hold for video
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
        <button
          type="button"
          onPointerDown={handleShutterDown}
          onPointerUp={handleShutterUp}
          onPointerLeave={() => {
            if (holdTimerRef.current) {
              clearTimeout(holdTimerRef.current);
              holdTimerRef.current = null;
            }
          }}
          disabled={!!error}
          aria-label="Tap for photo, hold for video"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white disabled:opacity-40"
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
