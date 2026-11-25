import { cropRectForAspect } from "@/features/editor/crop";
import type { AspectRatioId, EditState, Rotation } from "@/features/editor/types";

/** The finished video's decisions, kept apart from the encoding so they
 * can be tested on their own (render-plan.test.ts). */

/** 1080 across a portrait post, the most a phone shows sharply. */
const MAX_SHORT_SIDE = 1080;
const MAX_LONG_SIDE = 1920;

function evenFloor(n: number): number {
  return Math.max(2, Math.floor(n / 2) * 2);
}

/** The output size for an edit: the cropped region of the source, turned
 * if the edit turns it, brought within 1080x1920 and never enlarged.
 * Enlarging adds no detail, only bytes. */
export function outputSizeFor(
  aspect: AspectRatioId,
  sourceWidth: number,
  sourceHeight: number,
  rotation: Rotation,
): { width: number; height: number } {
  const crop = cropRectForAspect(aspect, 0.5, sourceWidth, sourceHeight, rotation);
  let w = crop.width * sourceWidth;
  let h = crop.height * sourceHeight;
  if (rotation === 90 || rotation === 270) [w, h] = [h, w];
  const scale = Math.min(1, MAX_SHORT_SIDE / Math.min(w, h), MAX_LONG_SIDE / Math.max(w, h));
  return { width: evenFloor(w * scale), height: evenFloor(h * scale) };
}

/** The clip's own frame rate, within 24-60. A 120fps clip plays back no
 * smoother in a feed and costs twice the bytes. */
export function outputFrameRate(sourceRate: number): number {
  if (!(sourceRate > 0) || !Number.isFinite(sourceRate)) return 30;
  return Math.min(60, Math.max(24, Math.round(sourceRate)));
}

/**
 * What happens to the sound:
 * - "copy": the clip's own sound, untouched, carried over as it was
 *   encoded (no quality lost, nothing to encode).
 * - "none": muted, with nothing added.
 * - "mix": anything else (an added sound or voiceover, a changed volume,
 *   a changed speed). Rendered and encoded fresh.
 */
export function audioPlanFor(state: EditState): "copy" | "none" | "mix" {
  const added = !!state.musicFile || !!state.voiceoverFile;
  if (!added && state.originalVolume === 0) return "none";
  if (!added && state.originalVolume === 1 && state.playbackRate === 1) return "copy";
  return "mix";
}
