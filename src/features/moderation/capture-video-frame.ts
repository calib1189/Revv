/**
 * Grabs the first decodable frame from a video file as a JPEG File, so a
 * video post can go through the same still-image moderation check as a
 * photo post (moderateMediaAction) — there's no frame-by-frame video
 * scanning here, just a single sampled frame as a good-enough proxy.
 *
 * Deliberately does NOT seek to find that frame. A freshly-recorded/
 * exported clip commonly reports a bogus Infinity/NaN duration until
 * forced through a seek-to-a-huge-value workaround — the fix already
 * applied in readVideoDurationSeconds (compose-post-form.tsx) and
 * video-editor.tsx. This function originally
 * tried to reuse that same seek, then seek again to a specific
 * timestamp to sample — but that second seek can race against a stale
 * `seeked` event left over from the first one, which is exactly what
 * broke video posting the first time this was "fixed." Waiting for
 * `loadeddata` (the first frame actually decoded and drawable) instead
 * needs no seeking and no duration at all, sidestepping the whole bug
 * class rather than trying to out-engineer it a second time.
 *
 * Attaches the <video> element off-screen rather than leaving it fully
 * detached — WebKit stops reliably decoding a <video> that was never
 * attached to the document at all, the same bug fixed elsewhere in this
 * feature area (camera-recorder.tsx, video-editor.tsx).
 */
export function captureVideoFrame(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = "position:fixed;left:-9999px;top:0;width:320px;height:320px;";
    document.body.appendChild(video);

    function cleanup() {
      URL.revokeObjectURL(url);
      video.remove();
    }

    video.onloadeddata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 320;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Could not create a canvas context."));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (!blob) {
            reject(new Error("Could not capture a video frame."));
            return;
          }
          resolve(new File([blob], "frame.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read that video."));
    };
    video.src = url;
  });
}
