export interface CropRect {
  /** All four fields are normalized 0-1 fractions of the source video's
   * natural width/height, not pixels — keeps them meaningful regardless
   * of what resolution the source clip actually is. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextLayer {
  id: string;
  text: string;
  /** Normalized 0-1 position, canvas-center-anchored. */
  x: number;
  y: number;
  color: string;
  fontSize: number;
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
