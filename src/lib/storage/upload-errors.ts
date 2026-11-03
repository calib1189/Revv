/** Thrown when the automated moderation check refuses a photo. Its
 * message is written for the person who picked it: retrying a refused
 * photo can never work, so "try again" would be actively misleading. */
export class ModerationRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModerationRejectedError";
  }
}

/** Thrown for an upload step that failed in a way worth naming — the
 * check being unavailable, storage refusing the file, the photo not
 * attaching to what it was for. Its message is always one of ours,
 * written for the person (never a raw database or network error, which
 * stays in the console): a single "try again" for every failure made a
 * report of one impossible to tell apart from another. */
export class UploadFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadFailedError";
  }
}

/** What to show for a failed upload: our own message when the failure
 * was one we named (see the two classes above), otherwise the caller's
 * generic fallback. */
export function uploadErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ModerationRejectedError || err instanceof UploadFailedError
    ? err.message
    : fallback;
}
