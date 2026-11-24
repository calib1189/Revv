import { headers } from "next/headers";

// The image renderer reads JPEG and PNG; anything else falls back to
// the plain card rather than failing the whole preview.
const DRAWABLE = new Set(["image/jpeg", "image/jpg", "image/png"]);

/** The cover photo as a data URL, or null when there isn't one the
 * renderer can draw. Never throws: a missing photo only costs the
 * preview its background.
 *
 * Goes through the app's own image optimizer rather than straight to
 * storage: the OG renderer ignores a phone photo's EXIF rotation, which
 * the optimizer bakes in, and it shrinks the photo to card size. Asking
 * for JPEG/PNG only keeps it from answering in WebP or AVIF. */
export async function coverPhoto(storageUrl: string): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const url = `${proto}://${host}/_next/image?url=${encodeURIComponent(storageUrl)}&w=1200&q=75`;
    const res = await fetch(url, {
      headers: { Accept: "image/jpeg,image/png" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!DRAWABLE.has(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
