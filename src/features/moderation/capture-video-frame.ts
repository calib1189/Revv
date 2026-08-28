/**
 * Grabs one representative frame from a video file as a JPEG File, so a
 * video post can go through the same still-image moderation check as a
 * photo post (moderateMediaAction) — there's no frame-by-frame video
 * scanning here, just a single mid-clip sample as a good-enough proxy.
 *
 * Attaches the <video> element off-screen rather than leaving it fully
 * detached — WebKit stops reliably decoding a <video> that was never
 * attached to the document at all, the same bug fixed elsewhere in this
 * feature area (camera-recorder.tsx, video-editor.tsx,
 * compose-post-form.tsx's readVideoDurationSeconds).
 */
export function captureVideoFrame(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.style.cssText = "position:fixed;left:-9999px;top:0;width:320px;height:320px;";
    document.body.appendChild(video);

    function cleanup() {
      URL.revokeObjectURL(url);
      video.remove();
    }

    function seekToMidpointAndCapture(duration: number) {
      video.onseeked = () => {
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
      video.currentTime = duration > 0 ? duration / 2 : 0;
    }

    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        seekToMidpointAndCapture(video.duration);
        return;
      }
      // The file here is always a just-exported/recorded clip, which
      // commonly reports a bogus duration (Infinity/NaN) until something
      // forces a seek near the true end — same fix already applied in
      // compose-post-form.tsx's readVideoDurationSeconds, video-editor.tsx,
      // and use-clip-combiner.ts. Missing this the first time around is
      // exactly what broke video moderation for real recorded clips.
      const onFixed = () => {
        video.removeEventListener("durationchange", onFixed);
        seekToMidpointAndCapture(video.duration);
      };
      video.addEventListener("durationchange", onFixed);
      video.currentTime = 1e10;
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read that video."));
    };
    video.src = url;
  });
}
