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
      source: File,
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
      let audioCtx: AudioContext | null = null;
      let canvasStream: MediaStream | null = null;
      let combinedStream: MediaStream | null = null;
      let originalNode: AudioBufferSourceNode | null = null;
      let musicNode: AudioBufferSourceNode | null = null;
      let voiceoverNode: AudioBufferSourceNode | null = null;

      // Wrapped in try/finally so a thrown error partway through (a codec
      // that turns out unsupported, decodeAudioData rejecting, anything)
      // can't leave the detached canvas/streams/audio context dangling or
      // isExporting stuck true forever — cleanup always runs exactly once,
      // on every exit path.
      try {
        // A looping element auto-restarts the instant it reaches its true
        // end — which races ahead of the trimEnd check below for any clip
        // where the trim's out-point is the clip's actual end (i.e. no trim
        // was applied at all), the single most common case. That race is
        // exactly what causes export to appear to loop forever.
        video.loop = false;

        await waitForSeek(video, state.trimStart);

        let audioTracks: MediaStreamTrack[] = [];
        const needsAudio = state.originalVolume > 0 || !!state.musicFile || !!state.voiceoverFile;
        if (needsAudio) {
          const AudioContextCtor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtx = new AudioContextCtor();
          const destination = audioCtx.createMediaStreamDestination();

          if (state.originalVolume > 0) {
            // The original clip's audio is decoded straight from the
            // source File's own bytes — not tapped from the playing
            // <video> element via captureStream() or
            // createMediaElementSource(). Both of those depend on
            // WebKit reliably exposing a live media element's audio as a
            // MediaStreamTrack, which repeated on-device testing showed
            // it doesn't do in the iOS app's WKWebView (editing preview,
            // plain <video> playback with no track-tapping involved, always
            // had sound; every export attempt that depended on tapping
            // the element's audio came out silent regardless of how the
            // resulting track was wired downstream). decodeAudioData reads
            // the file's real samples directly and has no dependency on
            // any of that — it's the exact same technique already proven
            // reliable here for mixing in a separate music file, just
            // applied to the clip's own audio track instead.
            try {
              const arrayBuffer = await source.arrayBuffer();
              const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
              originalNode = audioCtx.createBufferSource();
              originalNode.buffer = audioBuffer;
              // Keeps the original audio's pitch/speed matched to the
              // sped-up or slowed-down video — playbackRate scales an
              // AudioBufferSourceNode exactly like it does the <video>
              // element below.
              originalNode.playbackRate.value = state.playbackRate;
              const gain = audioCtx.createGain();
              gain.gain.value = state.originalVolume;
              originalNode.connect(gain).connect(destination);
            } catch {
              // A clip with no audio track at all (or one this browser
              // can't decode) just contributes silence — not fatal.
              originalNode = null;
            }
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

          if (state.voiceoverFile) {
            try {
              const arrayBuffer = await state.voiceoverFile.arrayBuffer();
              const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
              voiceoverNode = audioCtx.createBufferSource();
              voiceoverNode.buffer = audioBuffer;
              // Not looped — a narration recording plays once, starting
              // when the clip does, unlike music which is expected to
              // vamp for however long the clip runs.
              const gain = audioCtx.createGain();
              gain.gain.value = state.voiceoverVolume;
              voiceoverNode.connect(gain).connect(destination);
            } catch {
              voiceoverNode = null;
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

        // Previously nothing was listening for this at all — if the
        // recorder failed internally (an unsupported codec/track
        // combination only discovered at record time despite
        // isTypeSupported() reporting true, a security restriction,
        // anything), it failed completely silently: no chunks were ever
        // produced, and the rest of this function ran to completion
        // anyway, handing back an empty Blob with no indication anything
        // had gone wrong at the actual source. That's what was
        // happening — the failure surfaced two steps later, in a
        // different function entirely, as an opaque "couldn't read that
        // video file, 0KB".
        let recorderError: Error | null = null;
        recorder.onerror = (event) => {
          const err = (event as unknown as { error?: DOMException }).error;
          recorderError = new Error(
            `MediaRecorder error: ${err?.name ?? "unknown"}${err?.message ? ` — ${err.message}` : ""}`,
          );
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
        // Started in the same tick as video.play() below so the decoded
        // original-audio buffer and the video frames stay in sync. The
        // offset/duration args are in the *original* buffer's own time
        // units (unaffected by playbackRate) — exactly the units
        // trimStart/trimEnd are already expressed in everywhere else.
        const durationSeconds = Math.max(0.1, state.trimEnd - state.trimStart);
        originalNode?.start(0, state.trimStart, durationSeconds);
        musicNode?.start(0);
        voiceoverNode?.start(0);
        // currentTime still advances in source-time regardless of rate —
        // the trimEnd check below stays correct unchanged — but the
        // *wall-clock* time to get there scales inversely with it, which
        // the stall timeout below has to account for or a genuine slow-
        // motion export gets cut off mid-clip by its own safety net.
        video.playbackRate = state.playbackRate;
        await video.play();

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
        originalNode?.stop();
        musicNode?.stop();
        voiceoverNode?.stop();
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

        // A recorder error or a genuinely empty result used to be handed
        // back as if export had succeeded, only to fail two steps later
        // (reading the file back) with no way to tell that failure apart
        // from an unrelated one. Throwing here instead means the error
        // the user actually sees now names the real cause.
        if (recorderError) throw recorderError;
        if (blob.size === 0) {
          throw new Error(
            `Recording produced no data (recorder state: ${recorder.state}, chunks: ${chunks.length}).`,
          );
        }

        return { blob, extension };
      } finally {
        combinedStream?.getTracks().forEach((t) => t.stop());
        canvasStream?.getTracks().forEach((t) => t.stop());
        audioCtx?.close().catch(() => {});
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
