import { cropRectForAspect } from "@/features/editor/crop";
import { getFilterCss } from "@/features/editor/filters";
import type { EditState } from "@/features/editor/types";

export type MediaSource = HTMLVideoElement | HTMLImageElement;

function sourceDimensions(source: MediaSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.naturalWidth, height: source.naturalHeight };
}

/** Draws one composited frame — cropped, filtered, with text layers on
 * top — onto a canvas. Shared by the video editor (per animation frame)
 * and the photo editor (once, for both preview and export) — a photo is
 * just a source with a single frame, so the same crop/filter/text math
 * applies unchanged. Used identically for the live edit preview and for
 * the final export, so what's on screen while editing is exactly what
 * ends up in the output, not an approximation of it. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  source: MediaSource,
  canvasWidth: number,
  canvasHeight: number,
  state: Pick<EditState, "aspect" | "panOffset" | "filterId" | "textLayers">,
): void {
  const { width, height } = sourceDimensions(source);
  if (!width || !height) return;

  const crop = cropRectForAspect(state.aspect, state.panOffset, width, height);
  const sx = crop.x * width;
  const sy = crop.y * height;
  const sw = crop.width * width;
  const sh = crop.height * height;

  ctx.filter = getFilterCss(state.filterId);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
  ctx.filter = "none";

  for (const layer of state.textLayers) {
    const fontSize = layer.fontSize * (canvasWidth / 1080);
    ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, fontSize * 0.12);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillStyle = layer.color;
    const x = layer.x * canvasWidth;
    const y = layer.y * canvasHeight;
    ctx.strokeText(layer.text, x, y);
    ctx.fillText(layer.text, x, y);
  }
}
