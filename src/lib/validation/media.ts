export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

// Tighter than MAX_IMAGE_BYTES on purpose: this one bounds a photo
// headed for identifyVehicleAction, which base64-encodes it (~33%
// larger) into a Server Action body (bodySizeLimit: "20mb" in
// next.config.ts) and then into a Gemini inline-image request (which
// has its own payload ceiling around 20MB). A file right at the normal
// 15MB image cap becomes ~20MB of base64 — no headroom left for either
// limit. 8MB raw becomes ~10.7MB encoded, comfortably under both.
export const MAX_IDENTIFY_IMAGE_BYTES = 8 * 1024 * 1024;

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

export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_AUDIO_DURATION_SECONDS = 300;
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav"];

export function validateAudioFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return "Please upload an MP3, M4A, AAC, or WAV audio file.";
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return "Audio must be smaller than 20MB.";
  }
  return null;
}

export function validateAudioDuration(durationSeconds: number): string | null {
  if (durationSeconds > MAX_AUDIO_DURATION_SECONDS) {
    return "Sound must be 5 minutes or shorter.";
  }
  return null;
}
