"use client";

import { useEffect, useRef } from "react";
import { recordAdImpressionAction, recordAdClickAction } from "@/features/ads/actions";
import { HEADER_HEIGHT } from "@/components/shell/tab-pager-shell";

export interface SponsoredSlideData {
  campaignId: string;
  headline: string;
  caption: string | null;
  destinationUrl: string;
  photoUrl: string | null;
}

/** A paid placement, interleaved into the FYP alongside real posts
 * (swipe-feed.tsx) — same slide shape and object-cover treatment as an
 * organic post, so it doesn't feel jarring mid-scroll, but the
 * "Sponsored" label is real, not decorative: REVV never presents a paid
 * placement as an organic post. No like/comment/save here on purpose —
 * those are for the community's own content, not something bought. */
export function SponsoredSlide({
  data,
  slideHeight,
}: {
  data: SponsoredSlideData;
  slideHeight: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRecordedImpression = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          entry.intersectionRatio > 0.6 &&
          !hasRecordedImpression.current
        ) {
          hasRecordedImpression.current = true;
          recordAdImpressionAction(data.campaignId);
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [data.campaignId]);

  return (
    <div
      ref={containerRef}
      className={`relative ${slideHeight} w-full flex-shrink-0 snap-start overflow-hidden bg-black`}
    >
      {data.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- full-bleed slide, next/image fill needs a sized ancestor we don't have here
        <img src={data.photoUrl} alt="" className="h-full w-full object-cover" />
      )}

      <div
        className="pointer-events-none absolute inset-x-0 left-3 z-10 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white"
        style={{ top: `calc(${HEADER_HEIGHT} + 0.5rem)`, width: "fit-content" }}
      >
        Sponsored
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 pb-8">
        <div className="pointer-events-auto max-w-[calc(100%-1rem)] text-white">
          <p className="text-lg font-bold leading-snug">{data.headline}</p>
          {data.caption && (
            <p className="mt-1 line-clamp-2 text-sm text-white/85">{data.caption}</p>
          )}
          <a
            href={data.destinationUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            onClick={() => recordAdClickAction(data.campaignId)}
            className="mt-3 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
          >
            Learn more
          </a>
        </div>
      </div>
    </div>
  );
}
