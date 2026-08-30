import type { SVGProps } from "react";
import type { RankTier } from "@/lib/rating/rank";

/**
 * A distinct, detailed icon per tier — an ingot for every metal tier,
 * a faceted gem for every gem tier, a nebula star for cosmic — instead
 * of the same generic GemIcon recolored for all ten. Every gradient
 * stop is the exact same color already used for that tier's ring in
 * globals.css, so the icon and the ring it sits inside always read as
 * the same material rather than two different color choices for "gold."
 *
 * Ingots use the classic isometric-block technique (three visible
 * faces — top, right, front — each a different shade of the same
 * gradient), proportioned wide and flat like a real bullion bar rather
 * than a cube, plus a stamped groove line and a soft diagonal shine
 * band; gems use a proper brilliant-cut silhouette (a hexagonal table,
 * angled crown facets, and a pointed pavilion) with a 4-point sparkle
 * glyph instead of a plain highlight ellipse — the shape that actually
 * reads as "cut gemstone" rather than a kite with lines on it.
 */

function Ingot({
  id,
  top,
  front,
  side,
  outline,
  ...props
}: SVGProps<SVGSVGElement> & { id: string; top: [string, string]; front: [string, string]; side: [string, string]; outline: string }) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <linearGradient id={`${id}-top`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={top[0]} />
          <stop offset="100%" stopColor={top[1]} />
        </linearGradient>
        <linearGradient id={`${id}-front`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={front[0]} />
          <stop offset="100%" stopColor={front[1]} />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={side[0]} />
          <stop offset="100%" stopColor={side[1]} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="58%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* front face — wide and flat, a real bar's proportions, not a cube */}
      <path d="M14,68 L64,68 L64,48 L14,48 Z" fill={`url(#${id}-front)`} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      {/* side face — receding to the upper right */}
      <path d="M64,68 L88,54 L88,34 L64,48 Z" fill={`url(#${id}-side)`} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      {/* top face */}
      <path d="M14,48 L64,48 L88,34 L38,34 Z" fill={`url(#${id}-top)`} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      {/* stamped groove, the way a real ingot's face is often lined */}
      <path d="M20,60 L58,60" stroke={outline} strokeWidth="1" opacity="0.35" strokeLinecap="round" />
      {/* diagonal shine sweeping across the front + top */}
      <path d="M14,68 L64,68 L64,48 L14,48 Z" fill={`url(#${id}-shine)`} />
      <path d="M14,48 L64,48 L88,34 L38,34 Z" fill={`url(#${id}-shine)`} opacity="0.7" />
    </svg>
  );
}

function Gem({
  id,
  table,
  crownLeft,
  crownRight,
  pavilionLeft,
  pavilionRight,
  outline,
  ...props
}: SVGProps<SVGSVGElement> & {
  id: string;
  table: [string, string];
  crownLeft: string;
  crownRight: string;
  pavilionLeft: string;
  pavilionRight: string;
  outline: string;
}) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <linearGradient id={`${id}-table`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={table[0]} />
          <stop offset="100%" stopColor={table[1]} />
        </linearGradient>
      </defs>
      {/* pavilion — the pointed base, split left/right so light still
          reads as hitting from one side even below the girdle */}
      <path d="M14,42 L50,50 L38,88 Z" fill={pavilionLeft} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M86,42 L50,50 L62,88 Z" fill={pavilionRight} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M38,88 L50,50 L62,88 L50,97 Z" fill={pavilionLeft} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      {/* crown facets, angled up from the girdle to the table */}
      <path d="M14,42 L32,24 L50,50 Z" fill={crownLeft} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M86,42 L68,24 L50,50 Z" fill={crownRight} stroke={outline} strokeWidth="1.5" strokeLinejoin="round" />
      {/* table — the flat top facet, brightest, catches the most light */}
      <path
        d="M32,24 L68,24 L86,42 L50,50 L14,42 Z"
        fill={`url(#${id}-table)`}
        stroke={outline}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* a real 4-point sparkle glyph, not a plain ellipse — this is
          what actually reads as "catching the light" on a cut stone */}
      <path
        d="M38,30 L40.5,36.5 L47,39 L40.5,41.5 L38,48 L35.5,41.5 L29,39 L35.5,36.5 Z"
        fill="#ffffff"
        opacity="0.95"
      />
      <path d="M68,58 L69.4,61.4 L72.8,62.8 L69.4,64.2 L68,67.6 L66.6,64.2 L63.2,62.8 L66.6,61.4 Z" fill="#ffffff" opacity="0.65" />
    </svg>
  );
}

export function BronzeIngotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Ingot
      id="bronze"
      top={["#c98a52", "#a3652f"]}
      front={["#a3652f", "#6b3f1f"]}
      side={["#6b3f1f", "#4a2a14"]}
      outline="#3d2410"
      {...props}
    />
  );
}

export function CopperIngotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Ingot
      id="copper"
      top={["#e0a374", "#c17a4d"]}
      front={["#c17a4d", "#7a3f22"]}
      side={["#7a3f22", "#552a17"]}
      outline="#3f1e0f"
      {...props}
    />
  );
}

export function IronIngotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Ingot
      id="iron"
      top={["#cfd3d9", "#b8bcc4"]}
      front={["#b8bcc4", "#7a7e87"]}
      side={["#7a7e87", "#52555e"]}
      outline="#33353b"
      {...props}
    />
  );
}

export function SilverIngotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Ingot
      id="silver"
      top={["#ffffff", "#dde1e7"]}
      front={["#cbd0d8", "#8b909a"]}
      side={["#8b909a", "#5f636c"]}
      outline="#42454c"
      {...props}
    />
  );
}

export function GoldIngotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Ingot
      id="gold"
      top={["#fbe08a", "#e8bf4f"]}
      front={["#e8bf4f", "#a67e1f"]}
      side={["#a67e1f", "#7a5a13"]}
      outline="#573f0c"
      {...props}
    />
  );
}

export function PlatinumIngotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Ingot
      id="platinum"
      top={["#ffffff", "#eef4f8"]}
      front={["#e4ecf2", "#a9bac6"]}
      side={["#a9bac6", "#7c8e9a"]}
      outline="#5b6a75"
      {...props}
    />
  );
}

export function EmeraldGemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Gem
      id="emerald"
      table={["#8bffce", "#2fd48a"]}
      crownLeft="#17b374"
      crownRight="#0f8a5a"
      pavilionLeft="#0f8a5a"
      pavilionRight="#094328"
      outline="#062b19"
      {...props}
    />
  );
}

export function DiamondGemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Gem
      id="diamond"
      table={["#ffffff", "#bff4ff"]}
      crownLeft="#a5f3fc"
      crownRight="#7dd3fc"
      pavilionLeft="#7dd3fc"
      pavilionRight="#6bc4ea"
      outline="#3d7f96"
      {...props}
    />
  );
}

export function RubyGemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Gem
      id="ruby"
      table={["#ffc2cf", "#ff3b5c"]}
      crownLeft="#e33a5c"
      crownRight="#b41e3d"
      pavilionLeft="#b41e3d"
      pavilionRight="#5c0819"
      outline="#3d0511"
      {...props}
    />
  );
}

export function CosmicStarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <radialGradient id="cosmic-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#150826" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cosmic-star" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#f0abfc" />
          <stop offset="70%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#cosmic-halo)" />
      {[
        [14, 22], [82, 30], [88, 68], [10, 74], [60, 12], [30, 90],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={1.6 + (i % 3) * 0.5} fill="#ffffff" opacity={0.7} />
      ))}
      <path
        d="M50,10 L58,42 L90,50 L58,58 L50,90 L42,58 L10,50 L42,42 Z"
        fill="url(#cosmic-star)"
        stroke="#2e1065"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M50,10 L58,42 L50,50 L42,42 Z" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

export const RANK_MATERIAL_ICONS: Record<RankTier, (props: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  bronze: BronzeIngotIcon,
  copper: CopperIngotIcon,
  iron: IronIngotIcon,
  silver: SilverIngotIcon,
  gold: GoldIngotIcon,
  platinum: PlatinumIngotIcon,
  emerald: EmeraldGemIcon,
  diamond: DiamondGemIcon,
  ruby: RubyGemIcon,
  cosmic: CosmicStarIcon,
};
