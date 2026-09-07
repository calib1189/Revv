import { findObjectionableTerm } from "@/lib/moderation/text-filter";

const MAX_BIO_LENGTH = 300;

export function validateBio(bio: string): string | null {
  if (bio.length > MAX_BIO_LENGTH) {
    return `Bio must be ${MAX_BIO_LENGTH} characters or fewer.`;
  }
  if (findObjectionableTerm(bio)) return "That bio isn't allowed. Please rewrite it.";
  return null;
}

const MAX_DISPLAY_NAME_LENGTH = 50;

export function validateDisplayName(displayName: string): string | null {
  if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`;
  }
  if (findObjectionableTerm(displayName)) return "That name isn't allowed. Please choose another.";
  return null;
}
