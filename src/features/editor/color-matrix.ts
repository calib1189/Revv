import type { FilterPreset } from "@/features/editor/filters";

/**
 * A filter preset as one affine colour transform.
 *
 * Every step of the filter chain in pixel-filters.ts (brightness,
 * contrast, saturate, hue-rotate, sepia, grayscale) is linear in RGB, and
 * that chain clamps only once, at the end. So the whole chain is a single
 * 3x3 matrix plus an offset. The GPU applies it in one pass (gl-stage.ts)
 * and the result matches the per-pixel path to within one level
 * (color-matrix.test.ts). That is what lets the editors preview a filter
 * at full screen resolution, every frame, without stuttering.
 *
 * Works on 0-1 channel values. `m` is row-major: out.r = m[0]*r + m[1]*g +
 * m[2]*b + o[0].
 */
export interface ColorMatrix {
  m: number[];
  o: number[];
}

type Affine = { m: number[]; o: number[] };

const LUMA = [0.2126, 0.7152, 0.0722];

function identity(): Affine {
  return { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], o: [0, 0, 0] };
}

/** b after a: the transform that applies `a` first, then `b`. */
function then(a: Affine, b: Affine): Affine {
  const m: number[] = [];
  const o: number[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      m.push(b.m[r * 3] * a.m[c] + b.m[r * 3 + 1] * a.m[3 + c] + b.m[r * 3 + 2] * a.m[6 + c]);
    }
    o.push(b.m[r * 3] * a.o[0] + b.m[r * 3 + 1] * a.o[1] + b.m[r * 3 + 2] * a.o[2] + b.o[r]);
  }
  return { m, o };
}

function scale(k: number): Affine {
  return { m: [k, 0, 0, 0, k, 0, 0, 0, k], o: [0, 0, 0] };
}

/** (1 - t) * identity + t * target, for a linear target matrix. */
function toward(target: number[], t: number): Affine {
  const id = identity().m;
  return { m: id.map((v, i) => v + (target[i] - v) * t), o: [0, 0, 0] };
}

const GRAY = [...LUMA, ...LUMA, ...LUMA];
const SEPIA = [0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131];

function hueRotate(deg: number): number[] {
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return [
    0.213 + cos * 0.787 - sin * 0.213,
    0.715 - cos * 0.715 - sin * 0.715,
    0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143,
    0.715 + cos * 0.285 + sin * 0.14,
    0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787,
    0.715 - cos * 0.715 + sin * 0.715,
    0.072 + cos * 0.928 + sin * 0.072,
  ];
}

/** The same chain, in the same order, as applyFilter. */
export function colorMatrixFor(preset: FilterPreset): ColorMatrix {
  let t = identity();
  t = then(t, scale(preset.brightness));
  // Contrast pivots on 128 of 255, as the pixel path does.
  t = then(t, { m: scale(preset.contrast).m, o: Array(3).fill((128 / 255) * (1 - preset.contrast)) });
  // Saturate moves away from (or toward) the pixel's own grey.
  t = then(t, { m: GRAY.map((g, i) => (i % 4 === 0 ? 1 : 0) * preset.saturate + g * (1 - preset.saturate)), o: [0, 0, 0] });
  if (preset.hueRotateDeg !== 0) t = then(t, { m: hueRotate(preset.hueRotateDeg), o: [0, 0, 0] });
  if (preset.sepia > 0) t = then(t, toward(SEPIA, preset.sepia));
  if (preset.grayscale > 0) t = then(t, toward(GRAY, preset.grayscale));
  return t;
}

export function isIdentityMatrix({ m, o }: ColorMatrix): boolean {
  const id = identity().m;
  return m.every((v, i) => Math.abs(v - id[i]) < 1e-6) && o.every((v) => Math.abs(v) < 1e-6);
}

/** One 0-255 pixel through the matrix, unclamped. For tests and the CPU
 * fallback. */
export function applyColorMatrix({ m, o }: ColorMatrix, px: number[]): number[] {
  const [r, g, b] = px.map((v) => v / 255);
  return [0, 1, 2].map((row) => {
    const v = m[row * 3] * r + m[row * 3 + 1] * g + m[row * 3 + 2] * b + o[row];
    return Math.min(255, Math.max(0, v * 255));
  });
}
