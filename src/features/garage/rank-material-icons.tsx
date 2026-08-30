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
 * faces — top, left, right — each a different shade of the same
 * gradient) plus a soft diagonal shine band, which is what actually
 * sells "metal bar" at a glance; gems use a faceted-hexagon cut with
 * each facet a different opacity so light reads as hitting the stone
 * from one direction, plus a bright table-facet highlight.
 */

function Ingot({
  id,
  top,
  left,
  right,
  outline,
  ...props
}: SVGProps<SVGSVGElement> & { id: string; top: [string, string]; left: [string, string]; right: [string, string]; outline: string }) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <linearGradient id={`${id}-top`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={top[0]} />
          <stop offset="100%" stopColor={top[1]} />
        </linearGradient>
        <linearGradient id={`${id}-left`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={left[0]} />
          <stop offset="100%" stopColor={left[1]} />
        </linearGradient>
        <linearGradient id={`${id}-right`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={right[0]} />
          <stop offset="100%" stopColor={right[1]} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="48%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* left face */}
      <path d="M22,38 L50,50 L50,82 L22,70 Z" fill={`url(#${id}-left)`} stroke={outline} strokeWidth="1" strokeLinejoin="round" />
      {/* right face */}
      <path d="M50,50 L78,38 L78,70 L50,82 Z" fill={`url(#${id}-right)`} stroke={outline} strokeWidth="1" strokeLinejoin="round" />
      {/* top face */}
      <path d="M22,38 L50,26 L78,38 L50,50 Z" fill={`url(#${id}-top)`} stroke={outline} strokeWidth="1" strokeLinejoin="round" />
      {/* shine sweep across the left face */}
      <path d="M22,38 L50,50 L50,82 L22,70 Z" fill={`url(#${id}-shine)`} />
    </svg>
  );
}

function Gem({
  id,
  table,
  faceA,
  faceB,
  faceC,
  outline,
  ...props
}: SVGProps<SVGSVGElement> & {
  id: string;
  table: [string, string];
  faceA: string;
  faceB: string;
  faceC: string;
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
      {/* lower-left facet */}
      <path d="M28,40 L50,52 L38,86 Z" fill={faceA} stroke={outline} strokeWidth="1" strokeLinejoin="round" />
      {/* lower-right facet */}
      <path d="M72,40 L50,52 L62,86 Z" fill={faceB} stroke={outline} strokeWidth="1" strokeLinejoin="round" />
      {/* bottom point */}
      <path d="M38,86 L50,52 L62,86 L50,96 Z" fill={faceC} stroke={outline} strokeWidth="1" strokeLinejoin="round" />
      {/* crown facets */}
      <path d="M18,38 L28,40 L50,52 L14,46 Z" fill={faceA} stroke={outline} strokeWidth="1" strokeLinejoin="round" />
      <path d="M82,38 L72,40 L50,52 L86,46 Z" fill={faceB} stroke={outline} strokeWidth="1" strokeLinejoin="round" />
      {/* table (top facet) — brightest, catches the light */}
      <path
        d="M18,38 L38,22 L62,22 L82,38 L50,52 Z"
        fill={`url(#${id}-table)`}
        stroke={outline}
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* sparkle highlight */}
      <ellipse cx="42" cy="32" rx="7" ry="3.5" fill="#ffffff" opacity="0.75" transform="rotate(-18 42 32)" />
    </svg>
  );
}

export function BronzeIngotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Ingot
      id="bronze"
      top={["#c98a52", "#a3652f"]}
      left={["#a3652f", "#6b3f1f"]}
      right={["#6b3f1f", "#4a2a14"]}
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
      left={["#c17a4d", "#7a3f22"]}
      right={["#7a3f22", "#552a17"]}
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
      left={["#b8bcc4", "#7a7e87"]}
      right={["#7a7e87", "#52555e"]}
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
      left={["#cbd0d8", "#8b909a"]}
      right={["#8b909a", "#5f636c"]}
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
      left={["#e8bf4f", "#a67e1f"]}
      right={["#a67e1f", "#7a5a13"]}
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
      left={["#e4ecf2", "#a9bac6"]}
      right={["#a9bac6", "#7c8e9a"]}
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
      faceA="#17b374"
      faceB="#0f8a5a"
      faceC="#094328"
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
      faceA="#a5f3fc"
      faceB="#7dd3fc"
      faceC="#6bc4ea"
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
      faceA="#e33a5c"
      faceB="#b41e3d"
      faceC="#5c0819"
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
