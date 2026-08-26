"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface AudioGraph {
  video: HTMLVideoElement;
  audioCtx: AudioContext;
  source: MediaElementAudioSourceNode;
}

export function useVideoExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);
  // createMediaElementSource() can only ever be called once per <video>
  // element for its whole lifetime — a second call throws. Retrying a
  // failed export, or exporting more than once, reuses the same video
  // element (video-editor.tsx keeps one for its whole mount), so the
  // node has to be cached rather than recreated on every exportVideo()
  // call.
  const graphRef = useRef<AudioGraph | null>(null);

  useEffect(() => {
    return () => {
      graphRef.current?.audioCtx.close().catch(() => {});
      graphRef.current = null;
    };
  }, []);

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

      const wasLooping = video.loop;
      let canvasStream: MediaStream | null = null;
      let combinedStream: MediaStream | null = null;

      // Wrapped in try/finally so a thrown error partway through (a codec
      // that turns out unsupported, decodeAudioData rejecting, anything)
      // can't leave the detached canvas/streams dangling or isExporting
      // stuck true forever — cleanup always runs exactly once, on every
      // exit path.
      try {
        // A looping element auto-restarts the instant it reaches its true
        // end — which races ahead of the trimEnd check below for any clip
        // where the trim's out-point is the clip's actual end (i.e. no trim
        // was applied at all), the single most common case. That race is
        // exactly what causes export to appear to loop forever.
        video.loop = false;

        await waitForSeek(video, state.trimStart);

        // The original clip's audio is tapped via createMediaElementSource,
        // never video.captureStream() — WebKit (the iOS app's WKWebView)
        // has never reliably supported captureStream() on a plain <video>
        // element the way it does on <canvas>, so originalTrack silently
        // came back empty there and every export produced a video with no
        // audio, no matter how the resulting track was combined downstream.
        // createMediaElementSource doesn't depend on captureStream() at
        // all — it taps the element's actual decoded output directly, and
        // is supported everywhere a Web Audio graph exists. It can only be
        // created once per element for that element's whole lifetime, so
        // it's cached in graphRef and reused on retry instead of recreated.
        let graph = graphRef.current;
        if (!graph || graph.video !== video) {
          graph?.audioCtx.close().catch(() => {});
          const AudioContextCtor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioContextCtor();
          const source = audioCtx.createMediaElementSource(video);
          graph = { video, audioCtx, source };
          graphRef.current = graph;
        }
        const { audioCtx, source } = graph;
        // Clears whatever this source was routed to on a previous export
        // attempt (a fresh gain/destination gets wired below) — otherwise
        // a retry would leave it fanned out to both the old, abandoned
        // destination and the new one.
        source.disconnect();
        // Also routed to the real speakers, not just the recording
        // destination — createMediaElementSource takes over this
        // element's audio output entirely and permanently once created,
        // so without this, a failed export would leave the live edit
        // preview silently muted from then on if the user goes back to
        // keep editing (the disconnect() above severs this exact
        // connection too, so it has to be re-added on every export call,
        // not just the first).
        source.connect(audioCtx.destination);

        let musicNode: AudioBufferSourceNode | null = null;
        let audioTracks: MediaStreamTrack[] = [];

        const needsAudio = state.originalVolume > 0 || !!state.musicFile;
        if (needsAudio) {
          // --- Audio graph: mixes the original clip's own audio with an
          // optional music track, each independently volume-controlled,
          // into one destination stream fed to the recorder. ---
          const destination = audioCtx.createMediaStreamDestination();

          if (state.originalVolume > 0) {
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
        // The audio context itself is intentionally NOT closed here — it's
        // cached in graphRef for reuse on a retry (see above) and closed
        // only when this hook's owning component unmounts.
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
