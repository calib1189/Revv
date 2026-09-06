import Image from "next/image";

/** The login page's backdrop — real photos of top-rated builds already
 * on the app, slowly crossfading with a gentle Ken Burns drift. Real
 * cars, not an illustration or stock/generated imagery: these are
 * actual SORZA builds, which is both honest (CLAUDE.md: never present
 * mock output as real) and a better pitch than any drawing could be —
 * "here's what people are actually building here."
 *
 * Pure CSS, no animation library: each photo gets a staggered
 * animation-delay so they cycle one at a time through the same fade
 * loop (see .animate-auth-photo in globals.css) rather than needing any
 * JS-driven slideshow state. Respects prefers-reduced-motion by
 * freezing on whichever photo is mid-fade when the animation pauses. */
export function AuthBackground({ photos }: { photos: string[] }) {
  if (photos.length === 0) {
    return <div className="fixed inset-0 -z-10 bg-background" />;
  }

  const cycleSeconds = photos.length * 6;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {photos.map((url, i) => (
        <div
          key={url}
          className="animate-auth-photo absolute inset-0"
          style={{
            animationDuration: `${cycleSeconds}s`,
            animationDelay: `${i * 6 - cycleSeconds}s`,
          }}
        >
          <Image src={url} alt="" fill sizes="100vw" className="object-cover" />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
      <div className="absolute inset-0 bg-background/30" />
    </div>
  );
}
