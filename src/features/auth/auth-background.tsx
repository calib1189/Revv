/** The login page's backdrop — a looping muted video (cars being built
 * and driven), scaled down and re-encoded for the web (the source was a
 * 65MB 4K clip; this is a 540x960, 24fps, ~1.4MB re-encode — it sits
 * under a heavy dark scrim, so extra resolution was never visible, only
 * downloaded by every first-time visitor).
 * No poster/fallback image — just the video. Respects
 * prefers-reduced-motion by hiding it via CSS (see globals.css), which
 * falls back to the plain dark page background, not a still image.
 * muted+playsInline is required for mobile Safari/Chrome to autoplay
 * at all. */
export function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <video
        className="auth-video h-full w-full object-cover"
        src="/video/auth-bg.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/55 to-background/90" />
      <div className="absolute inset-0 bg-background/25" />
    </div>
  );
}
