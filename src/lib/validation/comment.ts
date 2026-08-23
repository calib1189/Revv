export function validateComment(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) return "Comment can't be empty.";
  if (trimmed.length > 2000) return "Comment must be 2000 characters or fewer.";
  return null;
}
