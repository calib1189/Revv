import { getImageProps } from "next/image";

const SUPABASE_PUBLIC_STORAGE = /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//;

/** A plain <img> for places where next/image's `fill` layout doesn't fit
 * (full-bleed feed slides, tiny list thumbnails). For SORZA's own uploads
 * it still goes through Next's image optimizer: the browser picks a
 * resized WebP/AVIF from `srcSet` instead of downloading the original,
 * which is often 2MB+ straight off a phone. That matters for cost as well
 * as speed. Supabase Storage bills every byte served from its CDN, and
 * the optimizer fetches each original once and then serves its own cached
 * copy (minimumCacheTTL in next.config.ts).
 *
 * Anything that isn't a Supabase public-storage URL renders unchanged,
 * since next.config.ts only allows that host. No `src` renders an empty
 * <img>, which is how callers defer loading until a slide is near view. */
export function MediaImg({
  src,
  sizes,
  className,
  loading,
}: {
  src: string | null | undefined;
  /** Same meaning as the HTML attribute: how wide this image is drawn. */
  sizes: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  if (!src || !SUPABASE_PUBLIC_STORAGE.test(src)) {
    // eslint-disable-next-line @next/next/no-img-element -- passthrough for empty or external sources
    return <img src={src ?? undefined} alt="" loading={loading} className={className} />;
  }
  // width/height only seed getImageProps; with `sizes` set, srcSet covers
  // every configured width and the CSS in className decides the box.
  const { props } = getImageProps({ src, alt: "", width: 1080, height: 1350, sizes });
  return (
    // eslint-disable-next-line @next/next/no-img-element -- srcSet comes from next/image's own optimizer
    <img
      src={props.src}
      srcSet={props.srcSet}
      sizes={props.sizes}
      alt=""
      loading={loading}
      decoding="async"
      className={className}
    />
  );
}
