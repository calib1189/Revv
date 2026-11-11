// Server-only. Fetches a car's cover photo for the poster renderer.

const DRAWABLE = new Set(["image/jpeg", "image/jpg", "image/png"]);

/**
 * The cover photo as a JPEG/PNG data URL, upright, at up to `width`
 * pixels wide. Goes through the app's own image optimizer, like the
 * share card (garage/[vehicleId]/opengraph-image.tsx): the renderer
 * ignores a phone photo's EXIF rotation, which the optimizer bakes in.
 * `origin` is this app's own address (the request's, or SITE_URL).
 */
export async function fetchPosterPhoto(storageUrl: string, origin: string, width: 1080 | 1920 | 3840): Promise<string> {
  const url = `${origin}/_next/image?url=${encodeURIComponent(storageUrl)}&w=${width}&q=75`;
  const res = await fetch(url, { headers: { Accept: "image/jpeg,image/png" }, signal: AbortSignal.timeout(45_000) });
  if (!res.ok) throw new Error(`Cover photo not loaded (${res.status}).`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!DRAWABLE.has(type)) throw new Error(`Cover photo came back as ${type || "an unknown type"}.`);
  const bytes = Buffer.from(await res.arrayBuffer());
  return `data:${type};base64,${bytes.toString("base64")}`;
}
