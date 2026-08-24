import { cropRectForAspect } from "@/features/editor/crop";
import { getFilterCss } from "@/features/editor/filters";
import type { EditState } from "@/features/editor/types";

/** Draws one composited frame — cropped, filtered, with text layers on
 * top — onto a canvas. Used identically for the live edit preview and
 * for every recorded export frame, so what's on screen while editing is
 * exactly what ends up in the final video, not an approximation of it. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvasWidth: number,
  canvasHeight: number,
  state: Pick<EditState, "aspect" | "panOffset" | "filterId" | "textLayers">,
): void {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) return;

  const crop = cropRectForAspect(state.aspect, state.panOffset, videoWidth, videoHeight);
  const sx = crop.x * videoWidth;
  const sy = crop.y * videoHeight;
  const sw = crop.width * videoWidth;
  const sh = crop.height * videoHeight;

  ctx.filter = getFilterCss(state.filterId);
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
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
