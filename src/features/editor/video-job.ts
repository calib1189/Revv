/**
 * A finished video that may still be on its way: the edit's render (or a
 * plain feed-size re-encode) runs in the background while the post screen
 * is up, and the post waits for it only if it hasn't finished by the time
 * Post is tapped.
 */
export interface VideoJob {
  /** The finished file. Rejects if the render fails or is cancelled. */
  readonly result: Promise<File>;
  /** 0-1, read at any time. */
  progress(): number;
  /** Called with 0-1 as the work moves. Returns an unsubscribe. */
  onProgress(listener: (ratio: number) => void): () => void;
  cancel(): void;
}

export class CancelledError extends Error {
  constructor() {
    super("Cancelled.");
    this.name = "CancelledError";
  }
}

export function startJob(run: (report: (ratio: number) => void, signal: AbortSignal) => Promise<File>): VideoJob {
  const controller = new AbortController();
  const listeners = new Set<(ratio: number) => void>();
  let current = 0;
  const report = (ratio: number) => {
    current = Math.max(current, Math.min(1, Math.max(0, ratio)));
    for (const l of listeners) l(current);
  };
  const result = run(report, controller.signal).then((file) => {
    report(1);
    return file;
  });
  // Nobody may be awaiting this yet; a failure is read from `result` later.
  result.catch(() => {});
  return {
    result,
    progress: () => current,
    onProgress(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
    cancel: () => controller.abort(),
  };
}

/** A file that's already done. */
export function readyJob(file: File): VideoJob {
  return startJob(async () => file);
}
