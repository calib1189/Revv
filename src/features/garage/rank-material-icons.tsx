import Image from "next/image";
import type { RankTier } from "@/lib/rating/rank";

const RANK_ICON_SRC: Record<RankTier, string> = {
  bronze: "/ranks/bronze.png",
  copper: "/ranks/copper.png",
  iron: "/ranks/iron.png",
  silver: "/ranks/silver.png",
  gold: "/ranks/gold.png",
  platinum: "/ranks/platinum.png",
  emerald: "/ranks/emerald.png",
  diamond: "/ranks/diamond.png",
  ruby: "/ranks/ruby.png",
  cosmic: "/ranks/cosmic.png",
};

/**
 * The actual rank emblem artwork per tier — not hand-drawn, the exact
 * crest images the user supplied for each tier, background-keyed to
 * transparent and cropped to just the badge (the tier name text baked
 * into the originals is cut off; RANK_LABELS already renders that).
 */
function RankIcon({
  tier,
  className,
  style,
}: {
  tier: RankTier;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`relative inline-block ${className ?? ""}`} style={style}>
      <Image src={RANK_ICON_SRC[tier]} alt="" fill unoptimized className="object-contain" />
    </span>
  );
}

export const RANK_MATERIAL_ICONS: Record<
  RankTier,
  (props: { className?: string; style?: React.CSSProperties }) => React.JSX.Element
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
