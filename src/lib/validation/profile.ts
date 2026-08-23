const MAX_BIO_LENGTH = 300;

export function validateBio(bio: string): string | null {
  if (bio.length > MAX_BIO_LENGTH) {
    return `Bio must be ${MAX_BIO_LENGTH} characters or fewer.`;
  }
  return null;
}
