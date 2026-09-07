import { findObjectionableTerm } from "@/lib/moderation/text-filter";

export function validateComment(body: string): string | null {
  const trimmed = body.trim();
  if (trimmed.length === 0) return "Comment can't be empty.";
  if (trimmed.length > 2000) return "Comment must be 2000 characters or fewer.";
  if (findObjectionableTerm(trimmed)) return "That comment isn't allowed. Please rewrite it.";
  return null;
}
