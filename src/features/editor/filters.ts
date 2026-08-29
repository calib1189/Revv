/** Visual filter presets, defined as pixel-math parameters rather than
 * CSS filter strings. CanvasRenderingContext2D.filter (the "just set
 * ctx.filter and drawImage" approach) has genuinely inconsistent support
 * across WebKit/WKWebView versions — the safe, guaranteed-everywhere way
 * to bake a filter into canvas output is direct ImageData manipulation,
 * which is what applyFilter (in pixel-filters.ts) does with these
 * parameters. */
export type FilterCategoryId = "color" | "bw" | "vintage" | "mood";

export const FILTER_CATEGORIES: { id: FilterCategoryId; label: string }[] = [
  { id: "color", label: "Color" },
  { id: "bw", label: "B&W" },
  { id: "vintage", label: "Vintage" },
  { id: "mood", label: "Mood" },
];

export interface FilterPreset {
  id: string;
  label: string;
  /** Absent only for "original" — the identity filter is always shown
   * first regardless of which category tab is selected, so it has no
   * category of its own to filter by. */
  category: FilterCategoryId | null;
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  sepia: number;
  hueRotateDeg: number;
}

const IDENTITY = { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, sepia: 0, hueRotateDeg: 0 };

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "original", label: "Original", category: null, ...IDENTITY },
  { id: "vivid", label: "Vivid", category: "color", ...IDENTITY, contrast: 1.18, saturate: 1.45, brightness: 1.02 },
  {
    id: "warm",
    label: "Warm",
    category: "color",
    ...IDENTITY,
    sepia: 0.18,
    saturate: 1.3,
    hueRotateDeg: -6,
    brightness: 1.04,
  },
  {
    id: "cool",
    label: "Cool",
    category: "color",
    ...IDENTITY,
    saturate: 1.15,
    hueRotateDeg: -12,
    brightness: 1.02,
    contrast: 1.05,
  },
  {
    id: "golden",
    label: "Golden",
    category: "color",
    ...IDENTITY,
    sepia: 0.3,
    saturate: 1.5,
    hueRotateDeg: -8,
    brightness: 1.08,
    contrast: 1.05,
  },
  {
    id: "ice",
    label: "Ice",
    category: "color",
    ...IDENTITY,
    saturate: 1.2,
    hueRotateDeg: -8,
    brightness: 1.08,
    contrast: 1.08,
  },
  { id: "noir", label: "Noir", category: "bw", ...IDENTITY, grayscale: 1, contrast: 1.3, brightness: 0.95 },
  { id: "bw", label: "B&W", category: "bw", ...IDENTITY, grayscale: 1 },
  {
    id: "vintage",
    label: "Vintage",
    category: "vintage",
    ...IDENTITY,
    sepia: 0.4,
    contrast: 0.9,
    brightness: 1.05,
    saturate: 1.1,
  },
  {
    id: "chrome",
    label: "Chrome",
    category: "vintage",
    ...IDENTITY,
    contrast: 1.1,
    saturate: 0.5,
    brightness: 1.1,
  },
  {
    id: "pastel",
    label: "Pastel",
    category: "vintage",
    ...IDENTITY,
    contrast: 0.82,
    brightness: 1.15,
    saturate: 0.7,
    sepia: 0.08,
  },
  { id: "moody", label: "Moody", category: "mood", ...IDENTITY, contrast: 1.25, saturate: 0.8, brightness: 0.88 },
  { id: "fade", label: "Fade", category: "mood", ...IDENTITY, contrast: 0.85, brightness: 1.12, saturate: 0.75 },
];

export function getFilterPreset(filterId: string): FilterPreset {
  return FILTER_PRESETS.find((f) => f.id === filterId) ?? FILTER_PRESETS[0];
}

/** Blends a preset toward IDENTITY by `intensity` (0-1) — 0 is no
 * filter at all, 1 is the preset at its full designed strength, and
 * anything in between is a straight lerp per parameter. This is what
 * "how much you want it applied" actually means: the same Vivid preset
 * at 30% vs. 100% intensity, not a fixed on/off toggle. */
export function blendFilterPreset(preset: FilterPreset, intensity: number): FilterPreset {
  const t = Math.max(0, Math.min(1, intensity));
  return {
    ...preset,
    brightness: 1 + (preset.brightness - 1) * t,
    contrast: 1 + (preset.contrast - 1) * t,
    saturate: 1 + (preset.saturate - 1) * t,
    grayscale: preset.grayscale * t,
    sepia: preset.sepia * t,
    hueRotateDeg: preset.hueRotateDeg * t,
  };
}
