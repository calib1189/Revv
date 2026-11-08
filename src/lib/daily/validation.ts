export const MAX_CAPTION = 150;
export const MAX_CHALLENGE_TITLE = 60;
export const MAX_CHALLENGE_DESCRIPTION = 280;

type Result<T> = { value: T } | { error: string };

export function normalizeCaption(input: string): Result<string | null> {
  const caption = input.trim().replace(/\s+/g, " ");
  if (!caption) return { value: null };
  if (caption.length > MAX_CAPTION) return { error: `Keep your caption under ${MAX_CAPTION} characters.` };
  return { value: caption };
}

export function normalizeChallengeText(input: {
  title: string;
  description: string;
}): Result<{ title: string; description: string }> {
  const title = input.title.trim().replace(/\s+/g, " ");
  const description = input.description.trim();
  if (!title) return { error: "Give the challenge a title." };
  if (title.length > MAX_CHALLENGE_TITLE) return { error: `Keep the title under ${MAX_CHALLENGE_TITLE} characters.` };
  if (!description) return { error: "Add a short description." };
  if (description.length > MAX_CHALLENGE_DESCRIPTION) {
    return { error: `Keep the description under ${MAX_CHALLENGE_DESCRIPTION} characters.` };
  }
  return { value: { title, description } };
}
