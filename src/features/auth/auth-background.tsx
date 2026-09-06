/** The login page's backdrop — a looping muted video (cars being built
 * and driven), scaled down and re-encoded for the web (the source was a
 * 65MB 4K clip; this is a 720x1280 re-encode at a fraction of that).
 * `poster` covers the gap before the video can play, and doubles as the
 * fallback for prefers-reduced-motion, where the video is hidden via
 * CSS (auth-video-hide-motion in globals.css) and the still frame is
 * all that shows — never fully blank, never forced-autoplaying video on
 * a system that asked not to. muted+playsInline is required for mobile
 * Safari/Chrome to autoplay at all. */
export function AuthBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <video
        className="auth-video h-full w-full object-cover"
        src="/video/auth-bg.mp4"
        poster="/video/auth-bg-poster.jpg"
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
