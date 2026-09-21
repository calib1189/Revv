/** Thrown when the automated moderation check refuses a photo. Its
 * message is written for the person who picked it, and is the ONE upload
 * failure worth showing verbatim: every other failure is a transient
 * "try again", but retrying a refused photo can never work. */
export class ModerationRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModerationRejectedError";
  }
}

/** What to show for a failed upload: the moderation reason if that's what
 * happened, otherwise the caller's own generic fallback. Saying "try
 * again" about a photo that was refused is actively misleading. */
export function uploadErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ModerationRejectedError ? err.message : fallback;
}
