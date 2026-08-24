import type { FilterPreset } from "@/features/editor/filters";

/** Applies a filter preset directly to pixel data — brightness/contrast/
 * saturate/grayscale/sepia/hue-rotate, in that order, matching how CSS's
 * own filter chain composes them. This is what makes filters work
 * regardless of whether the browser's CanvasRenderingContext2D.filter is
 * implemented (WebKit's support for it has real gaps) — it never touches
 * that API at all, just the raw RGBA bytes every canvas supports. */
export function applyFilter(imageData: ImageData, preset: FilterPreset): void {
  if (
    preset.brightness === 1 &&
    preset.contrast === 1 &&
    preset.saturate === 1 &&
    preset.grayscale === 0 &&
    preset.sepia === 0 &&
    preset.hueRotateDeg === 0
  ) {
    return;
  }

  const data = imageData.data;
  const contrastOffset = 128 * (1 - preset.contrast);
  const hueMatrix = hueRotateMatrix(preset.hueRotateDeg);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness
    if (preset.brightness !== 1) {
      r *= preset.brightness;
      g *= preset.brightness;
      b *= preset.brightness;
    }

    // Contrast
    if (preset.contrast !== 1) {
      r = r * preset.contrast + contrastOffset;
      g = g * preset.contrast + contrastOffset;
      b = b * preset.contrast + contrastOffset;
    }

    // Saturate (lerp toward/away from luminance-based gray)
    if (preset.saturate !== 1) {
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = gray + (r - gray) * preset.saturate;
      g = gray + (g - gray) * preset.saturate;
      b = gray + (b - gray) * preset.saturate;
    }

    // Hue rotate — the exact matrix the CSS/SVG filter spec defines for
    // hue-rotate(), so it matches what "hue-rotate()" would look like.
    if (preset.hueRotateDeg !== 0) {
      const nr = hueMatrix[0] * r + hueMatrix[1] * g + hueMatrix[2] * b;
      const ng = hueMatrix[3] * r + hueMatrix[4] * g + hueMatrix[5] * b;
      const nb = hueMatrix[6] * r + hueMatrix[7] * g + hueMatrix[8] * b;
      r = nr;
      g = ng;
      b = nb;
    }

    // Sepia (lerp toward the standard sepia transform)
    if (preset.sepia > 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r + (sr - r) * preset.sepia;
      g = g + (sg - g) * preset.sepia;
      b = b + (sb - b) * preset.sepia;
    }

    // Grayscale (lerp toward luminance-based gray)
    if (preset.grayscale > 0) {
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = r + (gray - r) * preset.grayscale;
      g = g + (gray - g) * preset.grayscale;
      b = b + (gray - b) * preset.grayscale;
    }

    data[i] = clamp255(r);
    data[i + 1] = clamp255(g);
    data[i + 2] = clamp255(b);
  }
}

function clamp255(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

/** The W3C Filter Effects spec's hue-rotate() color matrix, so this
 * matches the same math browsers use for the CSS function of the same
 * name, rather than an approximation. */
function hueRotateMatrix(deg: number): number[] {
  const angle = (deg * Math.PI) / 180;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  return [
    0.213 + cosA * 0.787 - sinA * 0.213,
    0.715 - cosA * 0.715 - sinA * 0.715,
    0.072 - cosA * 0.072 + sinA * 0.928,
    0.213 - cosA * 0.213 + sinA * 0.143,
    0.715 + cosA * 0.285 + sinA * 0.14,
    0.072 - cosA * 0.072 - sinA * 0.283,
    0.213 - cosA * 0.213 - sinA * 0.787,
    0.715 - cosA * 0.715 + sinA * 0.715,
    0.072 + cosA * 0.928 + sinA * 0.072,
  ];
}
