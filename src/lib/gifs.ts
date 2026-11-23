/** A GIF as SORZA stores it: GIPHY's id plus the size of the rendition
 * shown, never a URL (see migration 0130). */
export interface GifRef {
  id: string;
  width: number;
  height: number;
}

const GIF_ID = /^[A-Za-z0-9]{1,64}$/;

/** GIPHY's 200px-wide rendition, built from the id alone, so a stored GIF
 * can only ever load from GIPHY. */
export function gifUrl(id: string): string {
  return `https://media.giphy.com/media/${id}/200w.webp`;
}

function dimension(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 2000 ? n : null;
}

/** Reads a GIF from submitted form fields. Null when none was sent,
 * "invalid" when one was sent but doesn't match what the database
 * accepts. */
export function parseGif(raw: { id: unknown; width: unknown; height: unknown }): GifRef | null | "invalid" {
  if (raw.id == null || raw.id === "") return null;
  if (typeof raw.id !== "string" || !GIF_ID.test(raw.id)) return "invalid";
  const width = dimension(raw.width);
  const height = dimension(raw.height);
  if (width === null || height === null) return "invalid";
  return { id: raw.id, width, height };
}

export function parseGifFromForm(formData: FormData): GifRef | null | "invalid" {
  return parseGif({
    id: formData.get("gif_id"),
    width: formData.get("gif_width"),
    height: formData.get("gif_height"),
  });
}

/** The GIF on a stored message or comment row, if it has one. */
export function gifFromRow(row: {
  gif_id: string | null;
  gif_width: number | null;
  gif_height: number | null;
}): GifRef | null {
  if (!row.gif_id || !row.gif_width || !row.gif_height) return null;
  return { id: row.gif_id, width: row.gif_width, height: row.gif_height };
}
