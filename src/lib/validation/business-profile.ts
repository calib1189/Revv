export function validateBusinessDescription(description: string): string | null {
  if (description.trim().length > 500) {
    return "Description must be 500 characters or fewer.";
  }
  return null;
}
