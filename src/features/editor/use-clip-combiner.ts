"use client";

import { useCallback, useRef, useState } from "react";

const EXPORT_FPS = 30;
// Same 1080p ceiling as the in-app camera recorder (see camera-recorder.tsx's
// pickVideoBitsPerSecond comment) — combining is itself a real-time
// canvas-capture encode, same as recording, so the same overload risk
// applies. The video editor's own export pass re-encodes at 720p anyway;
// this only needs to preserve enough detail for that later pass to work
// with, not be the final output resolution.
const MAX_DIMENSION = 1920;

function pickVideoMimeType(): string {
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

function pickBitsPerSecond(width: number, height: number): number {
  const bitsPerSecond = Math.round(width * height * 0.14 * 30);
  return Math.min(Math.max(bitsPerSecond, 4_000_000), 16_000_000);
}

// Every wait point below (loadedmetadata, the durationchange fix-up) had
// no ceiling at all — if a clip stalled at any one of them for any reason
// (a codec quirk, a device-specific decoder stall), the whole
// Promise.all in combineClips below just hung forever with no error and
// no way to recover, which is exactly what "stuck on loading" looks
// like from the outside. This ceiling turns a silent hang into a real,
// actionable error instead.
const LOAD_CLIP_TIMEOUT_MS = 15000;

/** Loads a clip's metadata, working around the same lazily-written-
 * duration bug documented in video-editor.tsx: a clip produced by
 * MediaRecorder (which every clip fed in here either is, or resembles)
 * can report Infinity/NaN until something forces a seek near the true
 * end, which makes the engine rescan and fill the real value in. */
function loadClip(file: File): Promise<{ video: HTMLVideoElement; url: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    // Real (if off-screen) size, not display:none — WebKit is documented
    // to stop decoding an invisible <video> entirely, the same issue
    // fixed twice already in this feature area (camera-recorder.tsx,
    // video-editor.tsx).
    video.style.cssText = "position:fixed;left:-9999px;top:0;width:160px;height:160px;";
    document.body.appendChild(video);

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.remove();
      reject(new Error(`Couldn't read "${file.name}" — it may be corrupted or in an unsupported format.`));
    }, LOAD_CLIP_TIMEOUT_MS);

    function finish(d: number) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ video, url, duration: d });
    }

    video.addEventListener(
      "loadedmetadata",
      () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          finish(video.duration);
          return;
        }
        const onFixed = () => {
          video.removeEventListener("durationchange", onFixed);
          video.currentTime = 0;
          finish(video.duration);
        };
        video.addEventListener("durationchange", onFixed);
        video.currentTime = 1e10;
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        video.remove();
        reject(new Error(`Couldn't read "${file.name}".`));
      },
      { once: true },
    );
    video.src = url;
  });
}

/** Draws `source` into the canvas filling it edge to edge, center-cropping
 * whichever axis overflows — the same "cover" treatment the feed and the
 * camera viewfinder use, so a clip shot in a different aspect than the
 * first one doesn't come out letterboxed. Deliberately simpler than
 * draw-frame.ts's compositor: no crop/filter/text here, since those are
 * the video editor's job on the *combined* result afterward, not this
 * pre-processing step's. */
function drawCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const scale = Math.max(width / vw, height / vh);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
}

export interface CombineResult {
  file: File;
}

export function useClipCombiner() {
  const [isCombining, setIsCombining] = useState(false);
  const [progress, setProgress] = useState(0);

  const cancelRef = useRef(false);

  const cancelCombine = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const combineClips = useCallback(async (files: File[]): Promise<CombineResult> => {
    setIsCombining(true);
    setProgress(0);
    cancelRef.current = false;

    const loaded = await Promise.all(files.map(loadClip));

    const canvas = document.createElement("canvas");
    const first = loaded[0].video;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(first.videoWidth, first.videoHeight));
    canvas.width = Math.round(first.videoWidth * scale) || 720;
    canvas.height = Math.round(first.videoHeight * scale) || 1280;
    // Real off-screen positioning, not left dangling in memory only —
    // captureStream() is documented to be unreliable on a fully detached
    // canvas (see use-video-export.ts for the same fix).
    canvas.style.cssText = "position:fixed;left:-9999px;top:0;";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let audioCtx: AudioContext | null = null;
    let canvasStream: MediaStream | null = null;
    let combinedStream: MediaStream | null = null;
    let destination: MediaStreamAudioDestinationNode | null = null;

    try {
      if (!ctx) throw new Error("Canvas not supported.");

      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextCtor();
      destination = audioCtx.createMediaStreamDestination();

      // Each clip's audio is decoded straight from its own File bytes,
      // not tapped from the playing <video> element via
      // createMediaElementSource() — on-device testing showed that
      // doesn't reliably carry real samples in the iOS app's WKWebView
      // (see use-video-export.ts for the full story; this hit the exact
      // same failure mode). decodeAudioData has no dependency on a live
      // media element at all, so it isn't affected either way.
      const audioBuffers = await Promise.all(
        files.map(async (file) => {
          try {
            const arrayBuffer = await file.arrayBuffer();
            return await audioCtx!.decodeAudioData(arrayBuffer);
          } catch {
            // A clip with no audio track (or one this browser can't
            // decode) just contributes silence for its segment.
            return null;
          }
        }),
      );

      canvasStream = canvas.captureStream(EXPORT_FPS);
      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      const mimeType = pickVideoMimeType();
      const baseType = mimeType.split(";")[0];
      const extension = mimeType.includes("mp4") ? "mp4" : "webm";
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: pickBitsPerSecond(canvas.width, canvas.height),
      });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: baseType }));
      });

      recorder.start(1000);

      const frameIntervalMs = 1000 / EXPORT_FPS;
      for (let i = 0; i < loaded.length; i++) {
        if (cancelRef.current) break;
        const { video, duration } = loaded[i];
        const buffer = audioBuffers[i];
        if (buffer) {
          // Scheduled for "now" (0 in AudioContext time means immediately)
          // in the same tick as video.play() below, so this clip's audio
          // starts right alongside its video segment. Left to stop on its
          // own at `duration` rather than tracked for an explicit .stop()
          // — closing audioCtx in the outer finally silences everything
          // regardless of how the loop above it exits.
          const clipAudio = audioCtx.createBufferSource();
          clipAudio.buffer = buffer;
          clipAudio.connect(destination);
          clipAudio.start(0, 0, duration);
        }
        video.currentTime = 0;
        await video.play().catch(() => {});

        await new Promise<void>((resolve) => {
          let lastDrawAt = 0;
          function tick() {
            if (cancelRef.current) {
              resolve();
              return;
            }
            const now = performance.now();
            if (now - lastDrawAt >= frameIntervalMs) {
              lastDrawAt = now;
              drawCover(ctx!, video, canvas.width, canvas.height);
            }
            setProgress((i + video.currentTime / Math.max(duration, 0.1)) / loaded.length);
            if (video.currentTime >= duration - 0.05 || video.ended) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          }
          tick();
        });
        video.pause();
      }

      if (recorder.state !== "inactive") recorder.requestData();
      recorder.stop();

      // Same last-resort ceiling as the export pass — real muxing/
      // finalizing can legitimately take a few seconds on-device.
      const blob = await Promise.race([
        finished,
        new Promise<Blob>((resolve) => {
          setTimeout(() => resolve(new Blob(chunks, { type: baseType })), 15000);
        }),
      ]);

      return { file: new File([blob], `combined.${extension}`, { type: baseType }) };
    } finally {
      combinedStream?.getTracks().forEach((t) => t.stop());
      canvasStream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close().catch(() => {});
      canvas.remove();
      for (const { video, url } of loaded) {
        video.pause();
        video.remove();
        URL.revokeObjectURL(url);
      }
      setIsCombining(false);
      setProgress(1);
    }
  }, []);

  return { combineClips, cancelCombine, isCombining, progress };
}
