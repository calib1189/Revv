const MAX_PROMPT_LENGTH = 500;

export function validatePrompt(prompt: string): string | null {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) return "Describe the mod you want to see.";
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    return `Description must be ${MAX_PROMPT_LENGTH} characters or fewer.`;
  }
  return null;
}
