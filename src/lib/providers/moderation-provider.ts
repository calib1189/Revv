export interface ModerationResult {
  /** True when this media should be blocked from publishing. */
  flagged: boolean;
  /** Short, user-facing explanation of why — null when not flagged. */
  reason: string | null;
  /** 0-1, the model's confidence in its own flagged/not-flagged verdict. */
  confidence: number;
  isMock: boolean;
}

export interface ModerationProvider {
  /**
   * Screens one image for sexual/explicit content before it's allowed to
   * publish. `imageBytes` is always a still image — for a video post, the
   * caller captures one representative frame client-side
   * (features/moderation/capture-video-frame.ts) rather than passing raw
   * video in; full frame-by-frame video scanning isn't implemented.
   */
  moderateImage(
    imageBytes: ArrayBuffer,
    mimeType: string,
  ): Promise<ModerationResult>;
}
