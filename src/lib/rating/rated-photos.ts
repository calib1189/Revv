/** How many photos a rating sends the AI: the cover, then the gallery in
 * order. Every extra photo is another image in the vision call. */
export const MAX_RATING_PHOTOS = 4;

export interface RatableGalleryRow {
  /** vehicle_media.id */
  id: string;
  mediaId: string;
  kind: string;
}

/**
 * Which gallery rows the AI actually looks at when the build is rated.
 * The single source of truth for both the rating call and the gallery's
 * "Rated" badges, so what the owner is shown can't drift from what's
 * sent. The cover photo always takes a slot first (when there is one);
 * the rest go to gallery images in gallery order. Videos are skipped, and
 * so is the cover if it also sits in the gallery: it's already in.
 */
export function ratedGalleryIds(
  gallery: RatableGalleryRow[],
  coverMediaId: string | null,
  max = MAX_RATING_PHOTOS,
): string[] {
  const slots = coverMediaId ? max - 1 : max;
  return gallery
    .filter((row) => row.kind === "image" && row.mediaId !== coverMediaId)
    .slice(0, slots)
    .map((row) => row.id);
}
