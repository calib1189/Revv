"use client";

import { useCallback, useRef, useState } from "react";
import { drawFrame } from "@/features/editor/draw-frame";
import { cropRectForAspect } from "@/features/editor/crop";
import type { EditState } from "@/features/editor/types";

// 720p, not 1080p — the same trade-off already made for camera capture
// (see camera-recorder.tsx's pickVideoBitsPerSecond comment): exporting
// composites every frame in real time on the main thread (drawImage, and
// for any non-"original" filter, a full getImageData/per-pixel-math/
// putImageData pass), and 1080x1920 of that per frame is enough to fall
// behind on a real phone, which reads as choppy, dropped-looking
// playback. 720p is still sharp for a social feed and gives the encoder
// real headroom to keep up.
const MAX_DIMENSION = 720;
// Matches the canvas.captureStream(30) rate below — no point compositing
// frames faster than what's actually being captured.
const EXPORT_FPS = 30;

function exportCanvasSize(
  aspect: EditState["aspect"],
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  if (aspect === "9:16") return { width: 720, height: 1280 };
  if (aspect === "1:1") return { width: 720, height: 720 };
  if (aspect === "4:5") return { width: 720, height: 900 };

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
        // Original audio always goes through a Web Audio graph before it's
        // combined with the canvas's video track — even with no music and
        // untouched volume. Pairing canvas.captureStream()'s video track
        // directly with an audio track from this element's own
        // captureStream() (two different capture sessions) is a WKWebView
        // combination that silently drops the audio, the exact bug already
        // found and fixed in camera-recorder.tsx for live recording. This
        // export pipeline had the same bug hiding in its "no mixing needed"
        // fast path: recording the mic already works, but posts made from
        // it still came out silent because the *export* step re-introduced
        // the same raw-track-plus-canvas combination once music/volume
        // mixing wasn't in play to route it through Web Audio instead.
        // A real MediaStreamAudioDestinationNode's track doesn't have that
        // problem regardless of whether anything is actually being mixed.

        // Muting only makes sense when nothing downstream still needs this
        // element's own captureStream() audio track carrying real samples
        // — several WebKit versions are documented to stop producing real
        // audio samples on that track once its source element is muted.
        // The Web Audio graph below always taps that same track, so it
        // has to stay unmuted whenever there's any audio to route at all.
        video.muted = false;
        // A looping element auto-restarts the instant it reaches its true
        // end — which races ahead of the trimEnd check below for any clip
        // where the trim's out-point is the clip's actual end (i.e. no trim
        // was applied at all), the single most common case. That race is
        // exactly what causes export to appear to loop forever.
        video.loop = false;

        await waitForSeek(video, state.trimStart);

        const sourceStream = video.captureStream ? video.captureStream() : null;
        const originalTrack = sourceStream?.getAudioTracks()[0];

        let musicNode: AudioBufferSourceNode | null = null;
        let audioTracks: MediaStreamTrack[] = [];

        const needsAudio = (!!originalTrack && state.originalVolume > 0) || !!state.musicFile;
        if (needsAudio) {
          // --- Audio graph: mixes the original clip's own audio with an
          // optional music track, each independently volume-controlled,
          // into one destination stream fed to the recorder. Built even
          // when there's no music and volume is untouched — see the
          // comment above on why the original track never goes straight
          // into the recorder's stream unmixed. ---
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
        // currentTime still advances in source-time regardless of rate —
        // the trimEnd check below stays correct unchanged — but the
        // *wall-clock* time to get there scales inversely with it, which
        // the stall timeout below has to account for or a genuine slow-
        // motion export gets cut off mid-clip by its own safety net.
        video.playbackRate = state.playbackRate;
        await video.play();

        const durationSeconds = Math.max(0.1, state.trimEnd - state.trimStart);
        // Belt-and-suspenders: if playback ever stalls just short of
        // trimEnd for a reason this loop's own exit checks don't catch —
        // a stalled decode, a frame-timing mismatch between the duration
        // read earlier and what actually plays back — this guarantees
        // export still finishes with whatever was captured instead of
        // hanging forever.
        const startedAt = performance.now();
        const stallTimeoutMs = (durationSeconds / Math.max(state.playbackRate, 0.1)) * 3000 + 8000;
        const frameIntervalMs = 1000 / EXPORT_FPS;
        let lastDrawAt = 0;

        await new Promise<void>((resolve) => {
          function tick() {
            if (cancelRef.current) {
              resolve();
              return;
            }
            // requestAnimationFrame runs at the display's own refresh rate
            // (60-120Hz on a real phone) — compositing a full frame that
            // often that fast is wasted work for a 30fps export and one of
            // the things eating into the CPU budget that's supposed to go
            // toward keeping up with encoding. Only actually draws at
            // roughly the export's own target rate.
            const now = performance.now();
            if (now - lastDrawAt >= frameIntervalMs) {
              lastDrawAt = now;
              drawFrame(ctx!, video, canvas.width, canvas.height, state);
            }
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
        video.playbackRate = 1;
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
