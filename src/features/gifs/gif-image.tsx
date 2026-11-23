import { gifUrl, type GifRef } from "@/lib/gifs";

/** A sent GIF, at GIPHY's 200px-wide rendition. The stored size reserves
 * its space, so a thread doesn't jump as GIFs load. */
export function GifImage({ gif, className = "" }: { gif: GifRef; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- GIPHY serves its own sized rendition; it isn't an optimizer host
    <img
      src={gifUrl(gif.id)}
      alt="GIF"
      width={gif.width}
      height={gif.height}
      loading="lazy"
      decoding="async"
      draggable={false}
      style={{ aspectRatio: `${gif.width} / ${gif.height}` }}
      className={`block h-auto w-[200px] max-w-full bg-foreground/[0.06] object-cover ${className}`}
    />
  );
}
