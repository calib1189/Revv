// Starting long-edge cap for a resized image — generous enough to stay
// sharp on any real device screen, small enough to meaningfully shrink
// an oversized photo (a modern phone's default camera resolution is
// often 4000px+ on the long edge). If one pass at this size/quality
// still doesn't fit under the target, further passes step both of
// these down until it does — see the loop below.
const MAX_DIMENSION = 2500;
const MIN_DIMENSION = 640;
const MIN_JPEG_QUALITY = 0.35;

// A huge photo under memory pressure in the iPhone app's web view can
// leave an <img> decode hanging with neither onload nor onerror ever
// firing. Past this, give up on re-encoding and fall back to the file.
const DECODE_TIMEOUT_MS = 20_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Timed out reading that image."));
    }, DECODE_TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

function encode(
  img: HTMLImageElement,
  dimension: number,
  quality: number,
): Promise<File | null> {
  const scale = Math.min(1, dimension / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : null),
      "image/jpeg",
      quality,
    );
  });
}

// The real ceiling on a photo isn't the 15MB MAX_IMAGE_BYTES — it's the
// request-body cap on the server side. Photos get sent through Server
// Actions (the moderation check, vehicle identification), and Vercel
// rejects any request body over ~4.5MB no matter what next.config's
// bodySizeLimit says (that only raises Next's own limit). A normal phone
// photo is 3-12MB, so it sailed past every client-side check and then
// died server-side with nothing but a generic "try again". Everything is
// brought under this budget up front — 3.5MB leaves headroom for the
// multipart overhead.
const TRANSPORT_BUDGET_BYTES = 3.5 * 1024 * 1024;

// Formats storage and the server-side validator accept as-is. Anything
// else (HEIC from an iPhone, GIF, BMP, AVIF, ...) is converted to JPEG
// regardless of size.
const PASSTHROUGH_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Whether a picked file has to be re-encoded before upload: a format
 * the app doesn't store directly, or anything over the transport budget
 * (the caller's own limit, if smaller). Pure so it can be tested without
 * a canvas. */
export function needsNormalizing(file: { type: string; size: number }, maxBytes: number): boolean {
  if (!PASSTHROUGH_TYPES.has(file.type)) return true;
  return file.size > Math.min(maxBytes, TRANSPORT_BUDGET_BYTES);
}

/**
 * Makes any picked photo uploadable: converts other formats to JPEG and
 * shrinks anything over the transport budget — there's no "wrong format"
 * or "too large" this can't route around. A no-op for a JPEG/PNG/WebP
 * that already fits, so it only spends CPU and re-encoding quality on
 * images that actually need it. Always outputs JPEG when it does
 * re-encode, since a lossless format is rarely what's making a photo
 * large in the first place, and JPEG at high quality is visually
 * indistinguishable for a real photo while compressing far better.
 *
 * Decoding goes through the browser's own <img>, so the formats covered
 * are whatever the device's WebKit/Blink can decode — on an iPhone that
 * includes HEIC, which is what the camera roll produces.
 *
 * One pass at MAX_DIMENSION/high quality handles the overwhelming
 * majority of photos, but a single pass isn't guaranteed to fit an
 * unusually dense or huge source image — so this keeps stepping
 * dimension and quality down together until the result fits, rather
 * than falling back to the original (still-oversized) file.
 *
 * Never throws: several callers invoke this outside their try/catch, so a
 * rejection here would be an unhandled promise rejection and the upload
 * would just silently do nothing. If the image can't be decoded the
 * original file comes back untouched and validateImageFile gives the
 * person a real message.
 */
export async function compressImageIfNeeded(file: File, maxBytes: number): Promise<File> {
  if (!needsNormalizing(file, maxBytes)) return file;

  const budget = Math.min(maxBytes, TRANSPORT_BUDGET_BYTES);
  const mustConvert = !PASSTHROUGH_TYPES.has(file.type);

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  let dimension = MAX_DIMENSION;
  let quality = 0.85;
  let best: File | null = null;

  // Roughly halving the pixel count (dimension * ~0.75) and quality
  // step each pass converges fast — a handful of passes covers even a
  // huge starting image without looping indefinitely.
  for (let attempt = 0; attempt < 8; attempt++) {
    const encoded = await encode(img, dimension, quality);
    if (encoded) {
      best = encoded;
      if (encoded.size <= budget) return encoded;
    }
    if (dimension <= MIN_DIMENSION && quality <= MIN_JPEG_QUALITY) break;
    dimension = Math.max(MIN_DIMENSION, Math.round(dimension * 0.75));
    quality = Math.max(MIN_JPEG_QUALITY, quality - 0.1);
  }

  // Canvas encoding failed outright (best is still null), or — for a
  // format we could have kept as-is — re-encoding somehow made it bigger.
  // A file in a format we can't store has no "keep the original" option:
  // the JPEG is the only version that can be uploaded at all.
  if (!best) return file;
  if (!mustConvert && best.size >= file.size) return file;
  return best;
}

const CHECK_COPY_DIMENSION = 1280;

/** A small JPEG copy of a photo, for the moderation check to look at
 * instead of the photo itself. The check only needs to see what's in the
 * picture, and it's a request through a Vercel Function, which refuses
 * any body over ~4.5MB (FUNCTION_PAYLOAD_TOO_LARGE, before any of our code
 * runs). compressImageIfNeeded usually keeps a photo under that, but can
 * hand back the original when re-encoding doesn't help — and the full
 * photo would still be several times more than the check needs. ~1280px
 * comes out a few hundred KB. Falls back to the photo itself if it can't
 * be redrawn, which is no worse than sending it was before. */
export async function checkCopyOf(file: File): Promise<File> {
  try {
    const img = await loadImage(file);
    const encoded = await encode(img, CHECK_COPY_DIMENSION, 0.82);
    if (encoded) return encoded;
  } catch {
    // Falls through to the photo itself.
  }
  return file;
}
