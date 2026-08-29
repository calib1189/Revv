/** Same "ask the browser what it actually supports, in priority order"
 * pattern as pickMimeType in use-video-export.ts, for an audio-only
 * MediaRecorder (used by the in-app voiceover recorder). */
export function pickAudioRecorderMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: "audio/mp4", extension: "m4a" },
    { mimeType: "audio/webm;codecs=opus", extension: "webm" },
    { mimeType: "audio/webm", extension: "webm" },
  ];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }
  return { mimeType: "audio/webm", extension: "webm" };
}
