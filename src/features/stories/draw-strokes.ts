import type { Stroke } from "@/lib/stories/design";

/** Draws a story's strokes onto a canvas `w` by `h` pixels. Shared by the
 * editor and the viewer so a drawing looks the same in both. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  for (const stroke of strokes) drawStroke(ctx, stroke, w, h);
}

export function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  if (s.points.length < 4) return;
  const lw = s.width * w;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = s.tool === "eraser" ? "destination-out" : "source-over";

  const path = () => {
    ctx.beginPath();
    ctx.moveTo(s.points[0] * w, s.points[1] * h);
    // Smooth through the midpoints, so a fast stroke doesn't look jagged.
    for (let i = 2; i + 3 < s.points.length; i += 2) {
      const mx = ((s.points[i] + s.points[i + 2]) / 2) * w;
      const my = ((s.points[i + 1] + s.points[i + 3]) / 2) * h;
      ctx.quadraticCurveTo(s.points[i] * w, s.points[i + 1] * h, mx, my);
    }
    ctx.lineTo(s.points[s.points.length - 2] * w, s.points[s.points.length - 1] * h);
  };

  if (s.tool === "neon") {
    ctx.shadowColor = s.color;
    ctx.shadowBlur = lw * 2.2;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = lw;
    path();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = lw * 0.42;
    path();
    ctx.stroke();
  } else {
    ctx.strokeStyle = s.tool === "eraser" ? "#000" : s.color;
    ctx.globalAlpha = s.tool === "marker" ? 0.55 : 1;
    ctx.lineWidth = s.tool === "marker" ? lw * 1.8 : lw;
    path();
    ctx.stroke();
  }
  ctx.restore();
}
