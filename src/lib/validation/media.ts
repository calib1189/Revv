const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Please upload a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be smaller than 15MB.";
  }
  return null;
}

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 180;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function validateVideoFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return "Please upload an MP4, WebM, or MOV video.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return "Video must be smaller than 100MB.";
  }
  return null;
}

export function validateVideoDuration(durationSeconds: number): string | null {
  if (durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    return "Video must be 3 minutes or shorter.";
  }
  return null;
}
