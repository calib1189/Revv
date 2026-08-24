export interface CropRect {
  /** All four fields are normalized 0-1 fractions of the source video's
   * natural width/height, not pixels — keeps them meaningful regardless
   * of what resolution the source clip actually is. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TextFontId = "sans" | "serif" | "rounded" | "impact" | "condensed";

/** System font stacks only, deliberately — a canvas ctx.font that names
 * a web font which hasn't finished loading yet silently falls back and
 * can flicker once it does, and every frame in the live-preview loop
 * would race that. System fonts are always already available, so there's
 * no load to race, at the cost of not having infinite font choice. */
export const TEXT_FONTS: { id: TextFontId; label: string; stack: string }[] = [
  { id: "sans", label: "Sans", stack: "system-ui, -apple-system, sans-serif" },
  { id: "serif", label: "Serif", stack: "Georgia, 'Times New Roman', serif" },
  { id: "rounded", label: "Rounded", stack: "ui-rounded, -apple-system, sans-serif" },
  { id: "impact", label: "Impact", stack: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
  { id: "condensed", label: "Condensed", stack: "'Arial Narrow', sans-serif" },
];

export interface TextLayer {
  id: string;
  text: string;
  /** Normalized 0-1 position, canvas-center-anchored. */
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontId: TextFontId;
}

export type AspectRatioId = "9:16" | "1:1" | "4:5" | "original";

export interface EditState {
  trimStart: number;
  trimEnd: number;
  aspect: AspectRatioId;
  /** Pan offset (0-1) along whichever axis the chosen aspect ratio
   * actually crops — see cropRectForAspect in use-video-export.ts. */
  panOffset: number;
  filterId: string;
  textLayers: TextLayer[];
  musicFile: File | null;
  musicVolume: number;
  originalVolume: number;
}

export const DEFAULT_EDIT_STATE: Omit<EditState, "trimStart" | "trimEnd"> = {
  aspect: "9:16",
  panOffset: 0.5,
  filterId: "original",
  textLayers: [],
  musicFile: null,
  musicVolume: 0.8,
  originalVolume: 1,
};
