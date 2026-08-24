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
      // A canvas that's never actually part of the document is the same
      // category of bug as the two <video> elements fixed earlier this
      // session (the decode video, the camera preview source) — Safari's
      // captureStream() is documented to be unreliable on a fully detached
      // canvas. Real off-screen positioning instead of leaving it
      // dangling in memory only.
      canvas.style.cssText = "position:fixed;left:-9999px;top:0;";
      document.body.appendChild(canvas);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        canvas.remove();
        throw new Error("Canvas not supported.");
      }

      const wasMuted = video.muted;
      const wasLooping = video.loop;
      let audioCtx: AudioContext | null = null;
      let canvasStream: MediaStream | null = null;
      let combinedStream: MediaStream | null = null;

      // Wrapped in try/finally so a thrown error partway through (a codec
      // that turns out unsupported, decodeAudioData rejecting, anything)
      // can't leave the detached canvas/streams/audio context dangling or
      // isExporting stuck true forever — cleanup always runs exactly once,
      // on every exit path.
      try {
        video.muted = true;
        // A looping element auto-restarts the instant it reaches its true
        // end — which races ahead of the trimEnd check below for any clip
        // where the trim's out-point is the clip's actual end (i.e. no trim
        // was applied at all), the single most common case. That race is
        // exactly what causes export to appear to loop forever.
        video.loop = false;

        await waitForSeek(video, state.trimStart);

        const sourceStream = video.captureStream ? video.captureStream() : null;
        const originalTrack = sourceStream?.getAudioTracks()[0];
        // Only build the WebAudio mixing graph when it's actually needed —
        // mixing in music, or a non-default/non-zero volume. The common
        // case (no music, untouched volume) instead feeds the recorder
        // the original audio track directly, same as the camera recorder
        // already does successfully. A canvas video track paired with a
        // *synthetic* WebAudio-destination audio track is a much less
        // battle-tested combination for Safari's MP4 muxer than a canvas
        // track paired with a real captured track, and this export
        // pipeline producing unreadable files while the camera recorder
        // (which never touches WebAudio) doesn't is exactly the pattern
        // that points at the mixing graph itself as the remaining cause.
        const needsMixing = !!state.musicFile || (state.originalVolume !== 1 && state.originalVolume !== 0);

        let musicNode: AudioBufferSourceNode | null = null;
        let audioTracks: MediaStreamTrack[] = [];

        if (needsMixing) {
          // --- Audio graph: mixes the original clip's own audio with an
          // optional music track, each independently volume-controlled,
          // into one destination stream fed to the recorder. ---
          const AudioContextCtor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtx = new AudioContextCtor();
          const destination = audioCtx.createMediaStreamDestination();

          if (originalTrack && state.originalVolume > 0) {
            const source = audioCtx.createMediaStreamSource(new MediaStream([originalTrack]));
            const gain = audioCtx.createGain();
            gain.gain.value = state.originalVolume;
            source.connect(gain).connect(destination);
          }

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

          audioTracks = destination.stream.getAudioTracks();
        } else if (originalTrack && state.originalVolume === 1) {
          audioTracks = [originalTrack];
        }
        // originalVolume === 0 and no music: no audio track at all —
        // an intentionally silent export.

        canvasStream = canvas.captureStream(30);
        combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

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

        // A timeslice, instead of calling start() with no argument, makes
        // the recorder hand over chunks throughout the recording rather
        // than only once at the very end when it stops — belt-and-
        // suspenders with the stop-timeout fallback below: if `onstop`
        // never fires on some device, there's still real recorded data in
        // `chunks` to fall back to instead of an empty file.
        recorder.start(1000);
        musicNode?.start(0);
        await video.play();

        const durationSeconds = Math.max(0.1, state.trimEnd - state.trimStart);
        // Belt-and-suspenders: if playback ever stalls just short of
        // trimEnd for a reason this loop's own exit checks don't catch —
        // a stalled decode, a frame-timing mismatch between the duration
        // read earlier and what actually plays back — this guarantees
        // export still finishes with whatever was captured instead of
        // hanging forever.
        const startedAt = performance.now();
        const stallTimeoutMs = durationSeconds * 3000 + 8000;

        await new Promise<void>((resolve) => {
          function tick() {
            if (cancelRef.current) {
              resolve();
              return;
            }
            drawFrame(ctx!, video, canvas.width, canvas.height, state);
            setProgress(Math.min(1, (video.currentTime - state.trimStart) / durationSeconds));

            if (
              video.currentTime >= state.trimEnd ||
              video.ended ||
              performance.now() - startedAt > stallTimeoutMs
            ) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          }
          tick();
        });

        video.pause();
        // Forces one last ondataavailable flush before stopping — cheap
        // insurance that whatever's still buffered lands in `chunks` even
        // if `onstop` itself is the part that's unreliable.
        if (recorder.state !== "inactive") recorder.requestData();
        recorder.stop();
        musicNode?.stop();
        // recorder.onstop not firing (a real MediaRecorder flakiness on
        // some devices) would otherwise hang export forever right here,
        // after the progress bar already reads 100% — indistinguishable
        // from the app being frozen even though it isn't. On-device
        // muxing/finalizing a real recording can legitimately take
        // several seconds though, so this needs real headroom — too
        // short and it fires before a perfectly healthy export finishes,
        // handing back a Blob missing its finalization data (an
        // unreadable file) instead of the real one that was moments
        // away. 15s is a last-resort ceiling, not the expected path.
        const blob = await Promise.race([
          finished,
          new Promise<Blob>((resolve) => {
            setTimeout(() => resolve(new Blob(chunks, { type: baseType })), 15000);
          }),
        ]);

        return { blob, extension };
      } finally {
        combinedStream?.getTracks().forEach((t) => t.stop());
        canvasStream?.getTracks().forEach((t) => t.stop());
        audioCtx?.close().catch(() => {});
        video.muted = wasMuted;
        video.loop = wasLooping;
        canvas.remove();
        setIsExporting(false);
        setProgress(1);
      }
    },
    [],
  );

  const cancelExport = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return { exportVideo, cancelExport, isExporting, progress };
}

export { cropRectForAspect };
