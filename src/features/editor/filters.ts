/** Visual filter presets, defined as pixel-math parameters rather than
 * CSS filter strings. CanvasRenderingContext2D.filter (the "just set
 * ctx.filter and drawImage" approach) has genuinely inconsistent support
 * across WebKit/WKWebView versions — the safe, guaranteed-everywhere way
 * to bake a filter into canvas output is direct ImageData manipulation,
 * which is what applyFilter (in pixel-filters.ts) does with these
 * parameters. The `previewCss` field is CSS-equivalent purely for the
 * cheap little swatch decorations in the filter picker UI — if it
 * doesn't render on some browser, it's a decorative miss, not a broken
 * feature, which is why only the swatches use it. */
export interface FilterPreset {
  id: string;
  label: string;
  /** CSS filter string, used only for the small picker swatches. */
  previewCss: string;
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  sepia: number;
  hueRotateDeg: number;
}

const IDENTITY = { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, sepia: 0, hueRotateDeg: 0 };

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "original", label: "Original", previewCss: "none", ...IDENTITY },
  {
    id: "vivid",
    label: "Vivid",
    previewCss: "contrast(1.18) saturate(1.45) brightness(1.02)",
    ...IDENTITY,
    contrast: 1.18,
    saturate: 1.45,
    brightness: 1.02,
  },
  {
    id: "warm",
    label: "Warm",
    previewCss: "sepia(0.18) saturate(1.3) hue-rotate(-6deg) brightness(1.04)",
    ...IDENTITY,
    sepia: 0.18,
    saturate: 1.3,
    hueRotateDeg: -6,
    brightness: 1.04,
  },
  {
    id: "cool",
    label: "Cool",
    previewCss: "saturate(1.15) hue-rotate(-12deg) brightness(1.02) contrast(1.05)",
    ...IDENTITY,
    saturate: 1.15,
    hueRotateDeg: -12,
    brightness: 1.02,
    contrast: 1.05,
  },
  {
    id: "fade",
    label: "Fade",
    previewCss: "contrast(0.85) brightness(1.12) saturate(0.75)",
    ...IDENTITY,
    contrast: 0.85,
    brightness: 1.12,
    saturate: 0.75,
  },
  {
    id: "noir",
    label: "Noir",
    previewCss: "grayscale(1) contrast(1.3) brightness(0.95)",
    ...IDENTITY,
    grayscale: 1,
    contrast: 1.3,
    brightness: 0.95,
  },
  { id: "bw", label: "B&W", previewCss: "grayscale(1)", ...IDENTITY, grayscale: 1 },
  {
    id: "vintage",
    label: "Vintage",
    previewCss: "sepia(0.4) contrast(0.9) brightness(1.05) saturate(1.1)",
    ...IDENTITY,
    sepia: 0.4,
    contrast: 0.9,
    brightness: 1.05,
    saturate: 1.1,
  },
  {
    id: "chrome",
    label: "Chrome",
    previewCss: "contrast(1.1) saturate(0.5) brightness(1.1)",
    ...IDENTITY,
    contrast: 1.1,
    saturate: 0.5,
    brightness: 1.1,
  },
  {
    id: "golden",
    label: "Golden",
    previewCss: "sepia(0.3) saturate(1.5) hue-rotate(-8deg) brightness(1.08) contrast(1.05)",
    ...IDENTITY,
    sepia: 0.3,
    saturate: 1.5,
    hueRotateDeg: -8,
    brightness: 1.08,
    contrast: 1.05,
  },
  {
    id: "moody",
    label: "Moody",
    previewCss: "contrast(1.25) saturate(0.8) brightness(0.88)",
    ...IDENTITY,
    contrast: 1.25,
    saturate: 0.8,
    brightness: 0.88,
  },
  {
    id: "pastel",
    label: "Pastel",
    previewCss: "contrast(0.82) brightness(1.15) saturate(0.7) sepia(0.08)",
    ...IDENTITY,
    contrast: 0.82,
    brightness: 1.15,
    saturate: 0.7,
    sepia: 0.08,
  },
  {
    id: "ice",
    label: "Ice",
    previewCss: "saturate(1.2) hue-rotate(-8deg) brightness(1.08) contrast(1.08)",
    ...IDENTITY,
    saturate: 1.2,
    hueRotateDeg: -8,
    brightness: 1.08,
    contrast: 1.08,
  },
];

export function getFilterPreset(filterId: string): FilterPreset {
  return FILTER_PRESETS.find((f) => f.id === filterId) ?? FILTER_PRESETS[0];
}
