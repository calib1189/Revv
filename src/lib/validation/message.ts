export function validateMessageBody(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) return "Message can't be empty.";
  if (trimmed.length > 4000) return "Message must be 4000 characters or fewer.";
  return null;
}
