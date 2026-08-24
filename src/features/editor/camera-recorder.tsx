"use client";

import { useEffect, useRef, useState } from "react";
import { CameraFlipIcon, CloseIcon } from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";

function pickMimeType(): string {
  const candidates = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

const MAX_RECORD_SECONDS = 180;

export function CameraRecorder({
  onCaptured,
  onClose,
}: {
  onCaptured: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
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
        if (videoRef.current) videoRef.current.srcObject = stream;
        setError(null);
      } catch {
        setError(
          "Couldn't access your camera. Check that REVV has camera and microphone permission.",
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
    };
  }, []);

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = pickMimeType();
    const baseType = mimeType.split(";")[0];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: baseType });
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      onCaptured(new File([blob], `recording.${extension}`, { type: baseType }));
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
        return s + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
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
        {isRecording && (
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {formatTime(seconds)}
          </span>
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
        <div className="relative z-10 mx-4 mt-4">
          <Callout tone="danger">{error}</Callout>
        </div>
      )}

      <div className="relative z-10 mt-auto flex items-center justify-center pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!!error}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
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
