import { cropRectForAspect } from "@/features/editor/crop";
import { blendFilterPreset, getFilterPreset } from "@/features/editor/filters";
import { colorMatrixFor, isIdentityMatrix, type ColorMatrix } from "@/features/editor/color-matrix";
import { applyFilter } from "@/features/editor/pixel-filters";
import { TEXT_FONTS, type EditState } from "@/features/editor/types";

/**
 * Turns a source frame (a playing video, a photo, a decoded export frame)
 * into the finished picture: cropped, rotated, colour-filtered, with the
 * drawing and text on top. One class, used for the editors' live preview
 * and for the export, so what you see while editing is what you post.
 *
 * Three layers:
 * - base: the crop and rotation, drawn by the 2D canvas. Drawing video
 *   through a 2D canvas is also what tone-maps an iPhone's HDR footage to
 *   ordinary colour, which this keeps relying on.
 * - overlay: the drawing and text. Redrawn only when they change, not
 *   every frame.
 * - the colour filter and the overlay are combined on the GPU (WebGL) in
 *   one pass, at whatever resolution the canvas is. The CPU per-pixel
 *   path is kept only for devices without WebGL.
 */

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export type CompositeState = Pick<EditState, "aspect" | "panOffset" | "filterId" | "textLayers"> &
  Partial<Pick<EditState, "drawStrokes" | "rotation" | "filterIntensity">>;

/** Anything a frame can be drawn from, in its display orientation. */
export interface FrameSource {
  width: number;
  height: number;
  draw(ctx: Ctx2D, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
}

/** A video, image or canvas element as a FrameSource. Null until it has
 * dimensions (a video before its metadata, an image before it loads). */
export function elementSource(el: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): FrameSource | null {
  const width = el instanceof HTMLVideoElement ? el.videoWidth : el instanceof HTMLImageElement ? el.naturalWidth : el.width;
  const height = el instanceof HTMLVideoElement ? el.videoHeight : el instanceof HTMLImageElement ? el.naturalHeight : el.height;
  if (!width || !height) return null;
  return {
    width,
    height,
    draw: (ctx, sx, sy, sw, sh, dx, dy, dw, dh) => ctx.drawImage(el, sx, sy, sw, sh, dx, dy, dw, dh),
  };
}

function makeCanvas(like: AnyCanvas, width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== "undefined" && like instanceof OffscreenCanvas) return new OffscreenCanvas(width, height);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

function context2d(canvas: AnyCanvas): Ctx2D {
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (!ctx) throw new Error("2D canvas unavailable.");
  return ctx;
}

function fontStack(fontId: string): string {
  return TEXT_FONTS.find((f) => f.id === fontId)?.stack ?? TEXT_FONTS[0].stack;
}

/** The crop and rotation: the source's chosen region, filling the canvas. */
export function drawBase(ctx: Ctx2D, source: FrameSource, width: number, height: number, state: CompositeState): void {
  const rotation = state.rotation ?? 0;
  const crop = cropRectForAspect(state.aspect, state.panOffset, source.width, source.height, rotation);
  const sx = crop.x * source.width;
  const sy = crop.y * source.height;
  const sw = crop.width * source.width;
  const sh = crop.height * source.height;
  ctx.save();
  ctx.imageSmoothingQuality = "high";
  ctx.translate(width / 2, height / 2);
  if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
  const dw = rotation === 90 || rotation === 270 ? height : width;
  const dh = rotation === 90 || rotation === 270 ? width : height;
  source.draw(ctx, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

/** The drawing, then the text and stickers above it. Sizes are in
 * 1080-wide units, so a layer looks the same at any resolution. */
export function drawOverlay(ctx: Ctx2D, width: number, height: number, state: CompositeState): void {
  const unit = width / 1080;
  for (const stroke of state.drawStrokes ?? []) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * unit;
    ctx.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
    for (const point of stroke.points.slice(1)) ctx.lineTo(point.x * width, point.y * height);
    ctx.stroke();
  }
  for (const layer of state.textLayers) {
    const fontSize = layer.fontSize * unit;
    ctx.font = `700 ${fontSize}px ${fontStack(layer.fontId)}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const x = layer.x * width;
    const y = layer.y * height;
    if (!layer.isSticker) {
      // The outline keeps words legible over a busy picture; around an
      // emoji it would just look like a smudge.
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, fontSize * 0.12);
      ctx.strokeStyle = layer.color === "#000000" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.55)";
      ctx.fillStyle = layer.color;
      ctx.strokeText(layer.text, x, y);
    }
    ctx.fillText(layer.text, x, y);
  }
}

export function filterMatrixFor(state: CompositeState): ColorMatrix {
  return colorMatrixFor(blendFilterPreset(getFilterPreset(state.filterId), state.filterIntensity ?? 1));
}

// ---- The GPU stage -----------------------------------------------------------

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2((a_pos.x + 1.0) * 0.5, (1.0 - a_pos.y) * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_base;
uniform sampler2D u_overlay;
uniform mat3 u_m;
uniform vec3 u_o;
uniform float u_overlayOn;
void main() {
  vec3 rgb = clamp(u_m * texture2D(u_base, v_uv).rgb + u_o, 0.0, 1.0);
  vec4 over = texture2D(u_overlay, v_uv) * u_overlayOn;
  gl_FragColor = vec4(rgb * (1.0 - over.a) + over.rgb, 1.0);
}`;

class GlStage {
  private constructor(
    private gl: WebGLRenderingContext,
    private baseTex: WebGLTexture,
    private overlayTex: WebGLTexture,
    private uM: WebGLUniformLocation | null,
    private uO: WebGLUniformLocation | null,
    private uOverlayOn: WebGLUniformLocation | null,
  ) {}

  static create(canvas: AnyCanvas): GlStage | null {
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        premultipliedAlpha: false,
        // Kept so the picture can be read back: a photo's export, and the
        // video encoder grabbing each finished frame.
        preserveDrawingBuffer: true,
      }) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) return null;

    const compile = (type: number, src: string) => {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, src);
      gl!.compileShader(shader);
      return gl!.getShaderParameter(shader, gl!.COMPILE_STATUS) ? shader : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return null;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const texture = (unit: number) => {
      const tex = gl!.createTexture();
      gl!.activeTexture(gl!.TEXTURE0 + unit);
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      // An empty 1x1 until the first upload, so sampling is always defined.
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, 1, 1, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, new Uint8Array(4));
      return tex;
    };
    const baseTex = texture(0);
    const overlayTex = texture(1);
    if (!baseTex || !overlayTex) return null;
    gl.uniform1i(gl.getUniformLocation(program, "u_base"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_overlay"), 1);
    if (gl.getError() !== gl.NO_ERROR) return null;
    return new GlStage(
      gl,
      baseTex,
      overlayTex,
      gl.getUniformLocation(program, "u_m"),
      gl.getUniformLocation(program, "u_o"),
      gl.getUniformLocation(program, "u_overlayOn"),
    );
  }

  draw(base: AnyCanvas, overlay: AnyCanvas | null, overlayChanged: boolean, matrix: ColorMatrix, width: number, height: number) {
    const gl = this.gl;
    gl.viewport(0, 0, width, height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.baseTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, base);
    if (overlay && overlayChanged) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.overlayTex);
      // Premultiplied, so the blend in the shader is a plain "over".
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, overlay);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    }
    const m = matrix.m;
    // GLSL matrices are column-major.
    gl.uniformMatrix3fv(this.uM, false, [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
    gl.uniform3fv(this.uO, matrix.o);
    gl.uniform1f(this.uOverlayOn, overlay ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  get lost() {
    return this.gl.isContextLost();
  }
}

// ---- The compositor ------------------------------------------------------------

export class Compositor {
  private gl: GlStage | null;
  private ctx: Ctx2D | null = null;
  private base: AnyCanvas;
  private baseCtx: Ctx2D;
  private overlay: AnyCanvas;
  private overlayCtx: Ctx2D;
  private overlayFor: { layers: unknown; strokes: unknown; width: number; height: number } | null = null;
  private overlayEmpty = true;

  constructor(
    readonly canvas: AnyCanvas,
    options: { gpu?: boolean } = {},
  ) {
    this.gl = options.gpu === false ? null : GlStage.create(canvas);
    if (!this.gl) this.ctx = context2d(canvas);
    this.base = makeCanvas(canvas, canvas.width || 1, canvas.height || 1);
    this.baseCtx = context2d(this.base);
    this.overlay = makeCanvas(canvas, canvas.width || 1, canvas.height || 1);
    this.overlayCtx = context2d(this.overlay);
  }

  /** True when the colour filter runs on the GPU. */
  get gpu() {
    return this.gl !== null;
  }

  /** The cropped, unfiltered picture of the last render (for the filter
   * thumbnails). */
  get unfiltered(): AnyCanvas {
    return this.ctx ? this.canvas : this.base;
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  resize(width: number, height: number) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.base.width = w;
    this.base.height = h;
    this.overlay.width = w;
    this.overlay.height = h;
    this.overlayFor = null;
  }

  /** Redraws the overlay only when its layers or the size changed. The
   * editors replace those arrays on every edit, so identity is enough. */
  private syncOverlay(state: CompositeState): boolean {
    const { width, height } = this.canvas;
    const f = this.overlayFor;
    if (f && f.layers === state.textLayers && f.strokes === state.drawStrokes && f.width === width && f.height === height) {
      return false;
    }
    this.overlayCtx.clearRect(0, 0, width, height);
    drawOverlay(this.overlayCtx, width, height, state);
    this.overlayFor = { layers: state.textLayers, strokes: state.drawStrokes, width, height };
    this.overlayEmpty = state.textLayers.length === 0 && (state.drawStrokes ?? []).length === 0;
    return true;
  }

  render(source: FrameSource, state: CompositeState) {
    const { width, height } = this.canvas;
    const matrix = filterMatrixFor(state);
    const overlayChanged = this.syncOverlay(state);
    if (this.gl) {
      // A lost context (the system reclaiming the GPU) draws nothing
      // until the browser restores it; the next frame tries again.
      if (this.gl.lost) return;
      this.baseCtx.clearRect(0, 0, width, height);
      drawBase(this.baseCtx, source, width, height, state);
      this.gl.draw(this.base, this.overlayEmpty ? null : this.overlay, overlayChanged, matrix, width, height);
      return;
    }
    const ctx = this.ctx;
    if (!ctx) return;
    drawBase(ctx, source, width, height, state);
    if (!isIdentityMatrix(matrix)) {
      const frame = ctx.getImageData(0, 0, width, height);
      applyFilter(frame, blendFilterPreset(getFilterPreset(state.filterId), state.filterIntensity ?? 1));
      ctx.putImageData(frame, 0, 0);
    }
    if (!this.overlayEmpty) ctx.drawImage(this.overlay, 0, 0);
  }
}
