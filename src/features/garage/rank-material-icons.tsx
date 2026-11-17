import Image from "next/image";
import type { RankTier } from "@/lib/rating/rank";

export const RANK_ICON_SRC: Record<RankTier, string> = {
  bronze: "/ranks/bronze.webp",
  copper: "/ranks/copper.webp",
  iron: "/ranks/iron.webp",
  silver: "/ranks/silver.webp",
  gold: "/ranks/gold.webp",
  platinum: "/ranks/platinum.webp",
  emerald: "/ranks/emerald.webp",
  diamond: "/ranks/diamond.webp",
  ruby: "/ranks/ruby.webp",
  cosmic: "/ranks/cosmic.webp",
};

/**
 * The actual rank emblem artwork per tier — not hand-drawn, the exact
 * crest images the user supplied for each tier, background-keyed to
 * transparent and cropped to just the badge (the tier name text baked
 * into the originals is cut off; RANK_LABELS already renders that).
 * Re-exported here as 1024px WebP (Lanczos upscale + a light sharpen
 * from the original 320px source) — the originals looked visibly soft
 * once stretched to the size the build-rating reveal renders them at.
 */
function RankIcon({
  tier,
  className,
  style,
  sizes = "64px",
}: {
  tier: RankTier;
  className?: string;
  style?: React.CSSProperties;
  /** How wide the badge is drawn. Most places draw it at 12-40px, so the
   * default lets Next serve a small resized copy instead of the full
   * 1024px file (~90KB per tier); the rating reveal passes its own. */
  sizes?: string;
}) {
  return (
    <span className={`relative inline-block ${className ?? ""}`} style={style}>
      <Image src={RANK_ICON_SRC[tier]} alt="" fill sizes={sizes} className="object-contain" />
    </span>
  );
}

export const RANK_MATERIAL_ICONS: Record<
  RankTier,
  (props: { className?: string; style?: React.CSSProperties; sizes?: string }) => React.JSX.Element
> = {
  bronze: (props) => <RankIcon tier="bronze" {...props} />,
  copper: (props) => <RankIcon tier="copper" {...props} />,
  iron: (props) => <RankIcon tier="iron" {...props} />,
  silver: (props) => <RankIcon tier="silver" {...props} />,
  gold: (props) => <RankIcon tier="gold" {...props} />,
  platinum: (props) => <RankIcon tier="platinum" {...props} />,
  emerald: (props) => <RankIcon tier="emerald" {...props} />,
  diamond: (props) => <RankIcon tier="diamond" {...props} />,
  ruby: (props) => <RankIcon tier="ruby" {...props} />,
  cosmic: (props) => <RankIcon tier="cosmic" {...props} />,
};
