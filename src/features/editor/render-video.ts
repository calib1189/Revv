/**
 * Renders an edit to its finished file with the device's own hardware
 * video encoder (WebCodecs, through Mediabunny), rather than by playing
 * the clip back in real time and recording the screen.
 *
 * - It runs faster than the clip plays, frame-accurate, with nothing on
 *   screen, so it can run in the background while the caption is being
 *   written (compose-post-form.tsx).
 * - It renders at up to 1080x1920, not the 720p the real-time recorder
 *   could keep up with.
 * - The clip's own sound is copied across untouched when it wasn't
 *   changed. Otherwise the mix (added sound, voiceover, volumes, speed) is
 *   rendered offline and encoded.
 *
 * Every frame goes through the same Compositor as the editor's preview.
 * prepareRender returns null when the device can't do any of this (no
 * WebCodecs, no H.264 encoder, no AAC encoder for a mix); the editor
 * then falls back to the real-time recorder (use-video-export.ts).
 */

import {
  MATROSKA,
  MP4,
  QTFF,
  WEBM,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  VideoSampleSink,
  canEncodeAudio,
  canEncodeVideo,
  type InputVideoTrack,
  type VideoSample,
} from "mediabunny";
import { Compositor, elementSource, type FrameSource } from "@/features/editor/compositor";
import { audioPlanFor, outputFrameRate, outputSizeFor } from "@/features/editor/render-plan";
import { decodeClipAudio } from "@/features/editor/use-video-export";
import { CancelledError } from "@/features/editor/video-job";
import { FEED_AUDIO_BITRATE, feedVideoMaxBitrate } from "@/lib/media/feed-video-plan";
import type { EditState } from "@/features/editor/types";

const VIDEO_FORMATS = [MP4, QTFF, WEBM, MATROSKA];
const MIX_SAMPLE_RATE = 48_000;

export type RenderRun = (report: (ratio: number) => void, signal: AbortSignal) => Promise<File>;

function makeCanvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

/** A decoded frame as something the compositor can draw from. A turned
 * frame (an iPhone portrait clip is stored sideways with a rotation flag)
 * is first drawn upright, so the crop maths works in display space. */
function frameSource(sample: VideoSample, upright: HTMLCanvasElement): FrameSource {
  if (sample.rotation === 0 && !sample.flip) {
    return {
      width: sample.displayWidth,
      height: sample.displayHeight,
      draw: (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => sample.draw(ctx, sx, sy, sw, sh, dx, dy, dw, dh),
    };
  }
  if (upright.width !== sample.displayWidth || upright.height !== sample.displayHeight) {
    upright.width = sample.displayWidth;
    upright.height = sample.displayHeight;
  }
  const ctx = upright.getContext("2d");
  if (ctx) sample.draw(ctx, 0, 0, upright.width, upright.height);
  return elementSource(upright) ?? { width: 1, height: 1, draw: () => {} };
}

function finished(buffer: ArrayBuffer | null): File {
  if (!buffer || buffer.byteLength === 0) throw new Error("The render produced no data.");
  return new File([buffer], "sorza-clip.mp4", { type: "video/mp4" });
}

/** The sound of the edit, rendered offline at its final length. */
async function renderMix(source: File, state: EditState, hasOriginal: boolean): Promise<AudioBuffer> {
  const rate = Math.max(0.1, state.playbackRate);
  const seconds = Math.max(0.1, (state.trimEnd - state.trimStart) / rate);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * MIX_SAMPLE_RATE), MIX_SAMPLE_RATE);

  if (hasOriginal && state.originalVolume > 0) {
    const buffer = await decodeClipAudio(ctx, source);
    if (!buffer) throw new Error("Couldn't read this video's sound, so it would have saved silent");
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = state.originalVolume;
    node.connect(gain).connect(ctx.destination);
    node.start(0, state.trimStart, Math.max(0.05, state.trimEnd - state.trimStart));
  }
  if (state.musicFile) {
    const buffer = await ctx.decodeAudioData(await state.musicFile.arrayBuffer());
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    // Loops the chosen part, not the track from its first second.
    const from = Math.min(state.musicStartMs / 1000, buffer.duration);
    node.loop = true;
    node.loopStart = from;
    node.loopEnd = buffer.duration;
    const gain = ctx.createGain();
    gain.gain.value = state.musicVolume;
    node.connect(gain).connect(ctx.destination);
    node.start(0, from);
  }
  if (state.voiceoverFile) {
    const buffer = await ctx.decodeAudioData(await state.voiceoverFile.arrayBuffer());
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = state.voiceoverVolume;
    node.connect(gain).connect(ctx.destination);
    node.start(0);
  }
  return ctx.startRendering();
}

/** The copy path: Mediabunny's conversion with our frames and the clip's
 * own sound carried over as it was (or dropped). Null if the conversion
 * would have to drop something it shouldn't. */
async function prepareConversion(
  input: Input,
  state: EditState,
  size: { width: number; height: number },
  fps: number,
  bitrate: number,
  dropAudio: boolean,
): Promise<RenderRun | null> {
  const canvas = makeCanvas(size.width, size.height);
  const compositor = new Compositor(canvas);
  const upright = makeCanvas(1, 1);
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
  const conversion = await Conversion.init({
    input,
    output,
    tracks: "primary",
    trim: { start: state.trimStart, end: state.trimEnd },
    video: {
      codec: "avc",
      frameRate: fps,
      quality: new Quality({ bitrate, bitrateMode: "constant" }),
      forceTranscode: true,
      processedWidth: size.width,
      processedHeight: size.height,
      process: (sample) => {
        compositor.render(frameSource(sample, upright), state);
        return canvas;
      },
    },
    audio: dropAudio ? { discard: true } : {},
  });
  if (!conversion.isValid || conversion.discardedTracks.some((t) => t.reason !== "discarded_by_user")) return null;

  return async (report, signal) => {
    const onAbort = () => void conversion.cancel();
    signal.addEventListener("abort", onAbort, { once: true });
    conversion.onProgress = (p) => report(p);
    try {
      await conversion.execute();
    } catch (err) {
      if (signal.aborted) throw new CancelledError();
      throw err;
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
    if (signal.aborted) throw new CancelledError();
    return finished(target.buffer);
  };
}

/** The mix path: frames drawn and encoded one by one, at the edit's speed,
 * with the rendered mix as the sound. */
function prepareMix(
  source: File,
  track: InputVideoTrack,
  state: EditState,
  size: { width: number; height: number },
  fps: number,
  bitrate: number,
  hasOriginal: boolean,
): RenderRun {
  return async (report, signal) => {
    const canvas = makeCanvas(size.width, size.height);
    const compositor = new Compositor(canvas);
    const upright = makeCanvas(1, 1);
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const video = new CanvasSource(canvas, {
      codec: "avc",
      bitrate: new Quality({ bitrate, bitrateMode: "constant" }),
    });
    const audio = new AudioBufferSource({ codec: "aac", bitrate: new Quality({ bitrate: FEED_AUDIO_BITRATE }) });
    output.addVideoTrack(video, { frameRate: fps });
    output.addAudioTrack(audio);
    const onAbort = () => void output.cancel();
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      // The sound first: it's the quick part, and it fails early if the
      // clip's sound can't be read.
      const mix = await renderMix(source, state, hasOriginal);
      report(0.06);
      await output.start();
      await audio.add(mix);
      audio.close();

      const rate = Math.max(0.1, state.playbackRate);
      const span = Math.max(0.05, state.trimEnd - state.trimStart);
      const step = 1 / fps;
      let next = 0;
      const sink = new VideoSampleSink(track);
      for await (const sample of sink.samples(state.trimStart, state.trimEnd)) {
        try {
          if (signal.aborted) throw new CancelledError();
          const t = Math.max(0, (sample.timestamp - state.trimStart) / rate);
          // Faster than real time leaves more frames than the output
          // rate needs; the extras are skipped rather than crammed in.
          if (t + step / 2 < next) continue;
          compositor.render(frameSource(sample, upright), state);
          await video.add(t, step);
          next = t + step;
          report(0.06 + 0.92 * Math.min(1, (sample.timestamp - state.trimStart) / span));
        } finally {
          sample.close();
        }
      }
      video.close();
      await output.finalize();
    } catch (err) {
      if (signal.aborted) throw new CancelledError();
      throw err;
    } finally {
      signal.removeEventListener("abort", onAbort);
    }
    return finished(target.buffer);
  };
}

/** Sets up the render for this edit, or null if this device can't render
 * it in the background (the editor then uses the real-time recorder). */
export async function prepareRender(source: File, state: EditState): Promise<RenderRun | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined" || typeof OfflineAudioContext === "undefined") {
    return null;
  }
  try {
    const input = new Input({ source: new BlobSource(source), formats: VIDEO_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) return null;
    const audioTrack = await input.getPrimaryAudioTrack();
    const size = outputSizeFor(state.aspect, await track.getDisplayWidth(), await track.getDisplayHeight(), state.rotation);
    const stats = await track.computePacketStats(90).catch(() => null);
    const fps = outputFrameRate(stats?.averagePacketRate ?? NaN);
    const bitrate = feedVideoMaxBitrate(size.width, size.height);
    if (!(await canEncodeVideo("avc", { width: size.width, height: size.height, bitrate, frameRate: fps }))) return null;

    const plan = audioPlanFor(state);
    if (plan !== "mix" || !audioTrack) {
      const conversion = await prepareConversion(input, state, size, fps, bitrate, plan === "none");
      if (conversion) return conversion;
    }
    // Mixed (or a copy that couldn't be carried over as it was): the sound
    // is rendered and encoded, which needs an AAC encoder.
    const aac = await canEncodeAudio("aac", { numberOfChannels: 2, sampleRate: MIX_SAMPLE_RATE, bitrate: FEED_AUDIO_BITRATE });
    if (!aac) return null;
    return prepareMix(source, track, state, size, fps, bitrate, !!audioTrack);
  } catch {
    return null;
  }
}
