import { cropRectForAspect } from "@/features/editor/crop";
import { getFilterPreset } from "@/features/editor/filters";
import { applyFilter } from "@/features/editor/pixel-filters";
import { TEXT_FONTS } from "@/features/editor/types";
import type { EditState } from "@/features/editor/types";

export type MediaSource = HTMLVideoElement | HTMLImageElement;

function sourceDimensions(source: MediaSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.naturalWidth, height: source.naturalHeight };
}

function fontStack(fontId: string): string {
  return TEXT_FONTS.find((f) => f.id === fontId)?.stack ?? TEXT_FONTS[0].stack;
}

/** Draws one composited frame — cropped, filtered, with text layers on
 * top — onto a canvas. Shared by the video editor (per animation frame)
 * and the photo editor (once, for both preview and export) — a photo is
 * just a source with a single frame, so the same crop/filter/text math
 * applies unchanged. Used identically for the live edit preview and for
 * the final export, so what's on screen while editing is exactly what
 * ends up in the output, not an approximation of it.
 *
 * Filters are baked in via direct pixel manipulation (pixel-filters.ts),
 * not CanvasRenderingContext2D.filter — WebKit's support for that API is
 * inconsistent enough in practice that relying on it means filters
 * silently do nothing on some devices. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  source: MediaSource,
  canvasWidth: number,
  canvasHeight: number,
  state: Pick<EditState, "aspect" | "panOffset" | "filterId" | "textLayers"> &
    Partial<Pick<EditState, "drawStrokes">>,
): void {
  const { width, height } = sourceDimensions(source);
  if (!width || !height) return;

  const crop = cropRectForAspect(state.aspect, state.panOffset, width, height);
  const sx = crop.x * width;
  const sy = crop.y * height;
  const sw = crop.width * width;
  const sh = crop.height * height;

  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);

  const preset = getFilterPreset(state.filterId);
  if (state.filterId !== "original") {
    const frame = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    applyFilter(frame, preset);
    ctx.putImageData(frame, 0, 0);
  }

  // Doodles render above the filtered frame but below text, so captions
  // stay legible over a scribble instead of getting drawn under it.
  for (const stroke of state.drawStrokes ?? []) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * (canvasWidth / 1080);
    ctx.moveTo(stroke.points[0].x * canvasWidth, stroke.points[0].y * canvasHeight);
    for (const point of stroke.points.slice(1)) {
      ctx.lineTo(point.x * canvasWidth, point.y * canvasHeight);
    }
    ctx.stroke();
  }

  for (const layer of state.textLayers) {
    const fontSize = layer.fontSize * (canvasWidth / 1080);
    ctx.font = `700 ${fontSize}px ${fontStack(layer.fontId)}`;
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
