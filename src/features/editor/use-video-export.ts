"use client";

import { useCallback, useRef, useState } from "react";
import { drawFrame } from "@/features/editor/draw-frame";
import { cropRectForAspect } from "@/features/editor/crop";
import type { EditState } from "@/features/editor/types";

const MAX_DIMENSION = 1080;

function exportCanvasSize(
  aspect: EditState["aspect"],
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  if (aspect === "9:16") return { width: 1080, height: 1920 };
  if (aspect === "1:1") return { width: 1080, height: 1080 };
  if (aspect === "4:5") return { width: 1080, height: 1350 };

  const scale = Math.min(1, MAX_DIMENSION / Math.max(videoWidth, videoHeight));
  return {
    width: Math.round(videoWidth * scale),
    height: Math.round(videoHeight * scale),
  };
}

function pickMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1,mp4a.40.2", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9,opus", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }
  return { mimeType: "video/webm", extension: "webm" };
}

function waitForSeek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

export interface ExportResult {
  blob: Blob;
  extension: string;
}

export function useVideoExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);

  const exportVideo = useCallback(
    async (
      video: HTMLVideoElement,
      state: EditState,
    ): Promise<ExportResult> => {
      setIsExporting(true);
      setProgress(0);
      cancelRef.current = false;

      const canvas = document.createElement("canvas");
      const { width, height } = exportCanvasSize(state.aspect, video.videoWidth, video.videoHeight);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");

      const wasMuted = video.muted;
      const wasLooping = video.loop;
      video.muted = true;
      // A looping element auto-restarts the instant it reaches its true
      // end — which races ahead of the trimEnd check below for any clip
      // where the trim's out-point is the clip's actual end (i.e. no trim
      // was applied at all), the single most common case. That race is
      // exactly what causes export to appear to loop forever.
      video.loop = false;

      await waitForSeek(video, state.trimStart);

      // --- Audio graph: mixes the original clip's own audio with an
      // optional music track, each independently volume-controlled, into
      // one destination stream fed to the recorder alongside the canvas. ---
      const AudioContextCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      const destination = audioCtx.createMediaStreamDestination();
      const cleanupFns: (() => void)[] = [];

      const sourceStream = video.captureStream ? video.captureStream() : null;
      const originalTrack = sourceStream?.getAudioTracks()[0];
      if (originalTrack && state.originalVolume > 0) {
        const source = audioCtx.createMediaStreamSource(new MediaStream([originalTrack]));
        const gain = audioCtx.createGain();
        gain.gain.value = state.originalVolume;
        source.connect(gain).connect(destination);
      }

      let musicNode: AudioBufferSourceNode | null = null;
      if (state.musicFile) {
        try {
          const arrayBuffer = await state.musicFile.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          musicNode = audioCtx.createBufferSource();
          musicNode.buffer = audioBuffer;
          musicNode.loop = true;
          const gain = audioCtx.createGain();
          gain.gain.value = state.musicVolume;
          musicNode.connect(gain).connect(destination);
        } catch {
          musicNode = null;
        }
      }

      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      const { mimeType, extension } = pickMimeType();
      // The Blob's own type drops the ;codecs=... suffix MediaRecorder
      // needs — validateVideoFile does an exact match against plain
      // "video/mp4"/"video/webm", not a prefix check.
      const baseType = mimeType.split(";")[0];
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: baseType }));
      });

      recorder.start();
      musicNode?.start(0);
      await video.play();

      const durationSeconds = Math.max(0.1, state.trimEnd - state.trimStart);

      await new Promise<void>((resolve) => {
        function tick() {
          if (cancelRef.current) {
            resolve();
            return;
          }
          drawFrame(ctx!, video, canvas.width, canvas.height, state);
          setProgress(Math.min(1, (video.currentTime - state.trimStart) / durationSeconds));

          if (video.currentTime >= state.trimEnd || video.ended) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        }
        tick();
      });

      video.pause();
      recorder.stop();
      musicNode?.stop();
      const blob = await finished;

      combinedStream.getTracks().forEach((t) => t.stop());
      canvasStream.getTracks().forEach((t) => t.stop());
      audioCtx.close().catch(() => {});
      cleanupFns.forEach((fn) => fn());
      video.muted = wasMuted;
      video.loop = wasLooping;

      setIsExporting(false);
      setProgress(1);
      return { blob, extension };
    },
    [],
  );

  const cancelExport = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { exportVideo, cancelExport, isExporting, progress };
}

export { cropRectForAspect };
