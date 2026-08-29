// Long-edge cap for a resized image — generous enough to stay sharp on
// any real device screen, small enough to meaningfully shrink an
// oversized photo (a modern phone's default camera resolution is often
// 4000px+ on the long edge).
const MAX_DIMENSION = 2500;
const JPEG_QUALITY = 0.85;

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

/**
 * Downscales and re-compresses an oversized image before it ever hits
 * validateImageFile's size check, instead of just rejecting it outright.
 * A no-op for anything already under the limit — this only spends CPU
 * and re-encoding quality on images that actually need it. Always
 * outputs JPEG regardless of the source format (PNG/WebP), since a
 * lossless format is rarely what's making an oversized photo large in
 * the first place, and JPEG at high quality is visually indistinguishable
 * for a real photo while compressing far better.
 */
export async function compressImageIfNeeded(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file;

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
  });
  // A failed re-encode (canvas.toBlob returning null, or a result that
  // somehow isn't actually smaller) still leaves the original file to
  // fall back to — validateImageFile's own size check is what actually
  // decides pass/fail either way, this is only trying to help.
  if (!blob || blob.size >= file.size) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
