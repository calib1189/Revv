/** Visual filter presets. Each maps to a real CSS filter string, applied
 * via canvas 2D's `ctx.filter` — the same property `drawImage` respects,
 * so what you see in the live preview is pixel-identical to what gets
 * baked into the exported video (same draw call, same filter, no
 * separate "preview vs. export" pipeline to drift apart). */
export interface FilterPreset {
  id: string;
  label: string;
  css: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "original", label: "Original", css: "none" },
  { id: "vivid", label: "Vivid", css: "contrast(1.18) saturate(1.45) brightness(1.02)" },
  { id: "warm", label: "Warm", css: "sepia(0.18) saturate(1.3) hue-rotate(-6deg) brightness(1.04)" },
  { id: "cool", label: "Cool", css: "saturate(1.15) hue-rotate(-12deg) brightness(1.02) contrast(1.05)" },
  { id: "fade", label: "Fade", css: "contrast(0.85) brightness(1.12) saturate(0.75)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.3) brightness(0.95)" },
  { id: "bw", label: "B&W", css: "grayscale(1)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.4) contrast(0.9) brightness(1.05) saturate(1.1)" },
  { id: "chrome", label: "Chrome", css: "contrast(1.1) saturate(0.5) brightness(1.1)" },
];

export function getFilterCss(filterId: string): string {
  return FILTER_PRESETS.find((f) => f.id === filterId)?.css ?? "none";
}
