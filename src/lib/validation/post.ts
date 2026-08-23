const MAX_CAPTION_LENGTH = 2200;
const MAX_PHOTOS = 10;

export function validateCaption(caption: string): string | null {
  if (caption.length > MAX_CAPTION_LENGTH) {
    return `Caption must be ${MAX_CAPTION_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validatePhotoCount(count: number): string | null {
  if (count === 0) return "Add at least one photo.";
  if (count > MAX_PHOTOS) return `You can attach up to ${MAX_PHOTOS} photos.`;
  return null;
}
