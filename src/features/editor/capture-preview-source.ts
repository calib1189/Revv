import type { MediaSource } from "@/features/editor/draw-frame";

const PREVIEW_WIDTH = 96;
const PREVIEW_HEIGHT = 128;

/** A single small, static "cover"-cropped snapshot of whatever frame the
 * source happens to be showing right now — captured once (when the
 * editor's metadata finishes loading) and reused for every filter
 * swatch, rather than each swatch drawing from a live, possibly-
 * different moment of a playing video. Real content, not a generic
 * gradient, without needing 12 live-updating canvases. */
export function capturePreviewSource(source: MediaSource): ImageData | null {
  const { width, height } =
    source instanceof HTMLVideoElement
      ? { width: source.videoWidth, height: source.videoHeight }
      : { width: source.naturalWidth, height: source.naturalHeight };
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scale = Math.max(PREVIEW_WIDTH / width, PREVIEW_HEIGHT / height);
  const sw = PREVIEW_WIDTH / scale;
  const sh = PREVIEW_HEIGHT / scale;
  const sx = (width - sw) / 2;
  const sy = (height - sh) / 2;
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
  return ctx.getImageData(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
}
