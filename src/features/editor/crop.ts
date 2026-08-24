import type { AspectRatioId, CropRect } from "@/features/editor/types";

const ASPECT_RATIOS: Record<Exclude<AspectRatioId, "original">, number> = {
  "9:16": 9 / 16,
  "1:1": 1,
  "4:5": 4 / 5,
};

/** Computes the source-video crop rect (normalized 0-1) for a target
 * aspect ratio and a pan offset. Crops the axis the video has "extra" of
 * relative to the target — e.g. a 16:9 landscape clip cropped to 9:16
 * portrait crops horizontally (keeps full height) and panOffset slides
 * that crop window left/right; "original" never crops at all. */
export function cropRectForAspect(
  aspect: AspectRatioId,
  panOffset: number,
  videoWidth: number,
  videoHeight: number,
): CropRect {
  if (aspect === "original" || !videoWidth || !videoHeight) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  const target = ASPECT_RATIOS[aspect];
  const videoAspect = videoWidth / videoHeight;

  if (videoAspect > target) {
    // Video is relatively wider than the target — crop width, keep full height.
    const width = target / videoAspect;
    const x = (1 - width) * panOffset;
    return { x, y: 0, width, height: 1 };
  }

  // Video is relatively taller than the target — crop height, keep full width.
  const height = videoAspect / target;
  const y = (1 - height) * panOffset;
  return { x: 0, y, width: 1, height };
}

/** Whether this aspect ratio actually needs a pan control for this
 * video's natural dimensions — no point showing a pan slider for "9:16"
 * on a clip that's already exactly 9:16. */
export function aspectNeedsPan(
  aspect: AspectRatioId,
  videoWidth: number,
  videoHeight: number,
): boolean {
  if (aspect === "original" || !videoWidth || !videoHeight) return false;
  const rect = cropRectForAspect(aspect, 0, videoWidth, videoHeight);
  return rect.width < 0.999 || rect.height < 0.999;
}
