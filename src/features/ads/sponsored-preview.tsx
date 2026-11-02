import type { ReactNode } from "react";

/** A phone-shaped frame drawn the way sponsored-slide.tsx renders a real
 * ad in the feed — full-bleed media, bottom scrim, headline, body,
 * "Learn more", and the Sponsored chip — so an advertiser sees the actual
 * result rather than guessing from a thumbnail. Server-safe; the media is
 * whatever the caller passes (a picked photo in the builder, a looping
 * clip on the overview). */
export function SponsoredPreview({
  media,
  headline,
  caption,
  placeholder,
  badge,
  className = "w-[200px]",
}: {
  media: ReactNode | null;
  headline: string;
  caption?: string | null;
  /** Shown inside the frame when there's no media yet. */
  placeholder?: ReactNode;
  /** A small label pinned to the top-left, e.g. "Example". */
  badge?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[9/16] overflow-hidden rounded-[26px] bg-[#111114] text-left shadow-[0_24px_60px_-24px_rgb(0_0_0/0.7)] ring-1 ring-inset ring-white/10 ${className}`}
    >
      {media ?? placeholder}

      {badge && (
        <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-white/85 backdrop-blur-md">
          {badge}
        </span>
      )}

      <div className="pointer-events-none absolute bottom-3.5 right-2.5 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[0.625rem] font-medium text-white">
        Sponsored
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent px-3 pb-4 pt-10">
        <p className="line-clamp-2 max-w-[calc(100%-3.5rem)] text-[0.9375rem] font-bold leading-snug text-white">
          {headline}
        </p>
        {caption && (
          <p className="mt-0.5 line-clamp-2 max-w-[calc(100%-3.5rem)] text-[0.6875rem] leading-snug text-white/85">
            {caption}
          </p>
        )}
        <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-[0.6875rem] font-semibold text-accent-foreground">
          Learn more
        </span>
      </div>
    </div>
  );
}
