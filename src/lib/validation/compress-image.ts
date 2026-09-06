// Starting long-edge cap for a resized image — generous enough to stay
// sharp on any real device screen, small enough to meaningfully shrink
// an oversized photo (a modern phone's default camera resolution is
// often 4000px+ on the long edge). If one pass at this size/quality
// still doesn't fit under the target, further passes step both of
// these down until it does — see the loop below.
const MAX_DIMENSION = 2500;
const MIN_DIMENSION = 640;
const MIN_JPEG_QUALITY = 0.35;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
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

/**
 * Downscales and re-compresses an oversized image before it ever hits
 * validateImageFile's size check, instead of just rejecting it outright
 * — there's no user-facing "file too large" error this can't route
 * around, no matter how large the original photo is. A no-op for
 * anything already under the target — this only spends CPU and
 * re-encoding quality on images that actually need it. Always outputs
 * JPEG regardless of the source format (PNG/WebP), since a lossless
 * format is rarely what's making an oversized photo large in the first
 * place, and JPEG at high quality is visually indistinguishable for a
 * real photo while compressing far better.
 *
 * One pass at MAX_DIMENSION/high quality handles the overwhelming
 * majority of oversized photos (a modern phone photo compressed at
 * 2500px/0.85 rarely clears 15MB), but a single pass isn't guaranteed
 * to fit an unusually dense or huge source image — so this keeps
 * stepping dimension and quality down together until the result fits,
 * rather than falling back to the original (still-oversized) file.
 */
export async function compressImageIfNeeded(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;

  const img = await loadImage(file);

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
      if (encoded.size <= maxBytes) return encoded;
    }
    if (dimension <= MIN_DIMENSION && quality <= MIN_JPEG_QUALITY) break;
    dimension = Math.max(MIN_DIMENSION, Math.round(dimension * 0.75));
    quality = Math.max(MIN_JPEG_QUALITY, quality - 0.1);
  }

  // Every attempt made the file bigger than the original somehow, or
  // canvas encoding failed outright (best is still null) — the original
  // file is the least-bad option left, same as before this loop existed.
  if (!best || best.size >= file.size) return file;
  return best;
}
