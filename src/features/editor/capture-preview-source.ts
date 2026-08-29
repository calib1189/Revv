const PREVIEW_WIDTH = 96;
const PREVIEW_HEIGHT = 128;

/** A single small, static "cover"-cropped snapshot of whatever frame the
 * source happens to be showing right now — captured once and reused for
 * every filter swatch, rather than each swatch drawing from a live,
 * possibly-different moment of a playing video. Real content, not a
 * generic gradient, without needing 12 live-updating canvases.
 *
 * Deliberately takes the editor's own already-rendering preview canvas
 * as the source, not the raw <video>/<img> element directly. A <video>
 * has no paintable frame yet the instant `loadedmetadata` fires (some
 * browsers don't decode/paint anything until `loadeddata` or later),
 * so drawImage()-ing it that early silently produces a blank/black
 * capture — the reported "no thumbnails" bug. The edit-preview canvas
 * only ever gets a drawImage call once drawFrame has actually composited
 * a real frame onto it, so capturing from that canvas after its first
 * successful draw reuses an already-proven-working paint instead of a
 * second, less reliable path guessing at video readiness itself. */
export function capturePreviewSource(source: HTMLCanvasElement): ImageData | null {
  const { width, height } = source;
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
