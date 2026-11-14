import { useId, type ReactNode } from "react";

/**
 * The invite program's four badges, drawn as one set with a rising
 * material for each rung: bronze, chrome, gold, then obsidian inlaid
 * with gold. Each has a ribbon carrying its invite count and an engraved
 * face. `shine` runs a slow band of light across an earned badge.
 *
 * Drawn on a 100x100 grid centred on (50, 50).
 */

export type InviteBadgeRung = 3 | 5 | 10 | 25;

interface Metal {
  hi: string;
  mid: string;
  lo: string;
  deep: string;
}

const BRONZE: Metal = { hi: "#ffd9b0", mid: "#c27a45", lo: "#6b3416", deep: "#2b1206" };
const CHROME: Metal = { hi: "#ffffff", mid: "#b9c2cf", lo: "#4b5563", deep: "#151a22" };
const GOLD: Metal = { hi: "#fff4c2", mid: "#e5ad3c", lo: "#7c4f0a", deep: "#2a1903" };
const OBSIDIAN: Metal = { hi: "#5a5a66", mid: "#24242b", lo: "#0b0b0e", deep: "#050506" };

const C = 50;

const RUNGS: Record<InviteBadgeRung, { name: string }> = {
  3: { name: "Early Supporter" },
  5: { name: "Featured Builder" },
  10: { name: "SORZA OG" },
  25: { name: "Founding Circle" },
};

export function inviteBadgeRung(achievementId: string): InviteBadgeRung | null {
  const n = Number(achievementId.match(/^invites_(\d+)$/)?.[1]);
  return n === 3 || n === 5 || n === 10 || n === 25 ? n : null;
}

function polygon(sides: number, radius: number, rotationDeg: number, cy = C): string {
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = ((rotationDeg + (360 / sides) * i) * Math.PI) / 180;
    return `${(C + radius * Math.cos(a)).toFixed(2)} ${(cy + radius * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join("L")}Z`;
}

function star(points: number, outer: number, inner: number, cx: number, cy: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** Polished metal: bright top, a dark horizon just past centre, light
 * coming back up from below. */
function MetalGradient({ id, metal, angle = 0 }: { id: string; metal: Metal; angle?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1" gradientTransform={`rotate(${angle} 0.5 0.5)`}>
      <stop offset="0" stopColor={metal.hi} />
      <stop offset="0.38" stopColor={metal.mid} />
      <stop offset="0.52" stopColor={metal.lo} />
      <stop offset="0.62" stopColor={metal.mid} />
      <stop offset="1" stopColor={metal.hi} stopOpacity={0.85} />
    </linearGradient>
  );
}

/** A deep enamel face, lit from above. */
function FaceGradient({ id, metal }: { id: string; metal: Metal }) {
  return (
    <radialGradient id={id} cx="0.5" cy="0.3" r="0.8">
      <stop offset="0" stopColor={metal.lo} />
      <stop offset="1" stopColor={metal.deep} />
    </radialGradient>
  );
}

/** Two laurel branches climbing the sides from the bottom: pairs of
 * leaves along a stem, smaller toward the tips. */
function Laurel({ r, pairs, span, fill, edge }: { r: number; pairs: number; span: number; fill: string; edge: string }) {
  const start = 100;
  const leaf = (x: number, y: number, rotate: number, size: number, key: string) => (
    <path
      key={key}
      d={`M0 0 C${2.6 * size} ${-3 * size} ${2.6 * size} ${-8 * size} 0 ${-11 * size} C${-2.6 * size} ${-8 * size} ${-2.6 * size} ${-3 * size} 0 0 Z`}
      transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotate.toFixed(1)})`}
      fill={fill}
      stroke={edge}
      strokeWidth={0.45}
    />
  );
  const leaves = Array.from({ length: pairs }, (_, i) => {
    const deg = start + (span / pairs) * (i + 0.5);
    const a = (deg * Math.PI) / 180;
    const x = C + r * Math.cos(a);
    const y = C + r * Math.sin(a);
    const size = 1 - (i / pairs) * 0.4;
    // Along the stem the branch grows toward increasing angle; its
    // direction there is deg + 90. Leaves fan out either side of it.
    const along = deg + 90 + 90;
    return [leaf(x, y, along - 38, size, `o${i}`), leaf(x, y, along + 38, size, `i${i}`)];
  }).flat();
  const tipDeg = start + span;
  const tip = (tipDeg * Math.PI) / 180;
  const a0 = (start * Math.PI) / 180;
  const stem = `M${(C + r * Math.cos(a0)).toFixed(2)} ${(C + r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 0 1 ${(C + r * Math.cos(tip)).toFixed(2)} ${(C + r * Math.sin(tip)).toFixed(2)}`;
  const branch = (
    <>
      <path d={stem} fill="none" stroke={edge} strokeWidth={1.1} strokeLinecap="round" />
      {leaves}
      {leaf(C + r * Math.cos(tip), C + r * Math.sin(tip), tipDeg + 180, 0.62, "tip")}
    </>
  );
  return (
    <g>
      <g>{branch}</g>
      <g transform="translate(100 0) scale(-1 1)">{branch}</g>
    </g>
  );
}

/** Each leaf lit from above, without the horizon band of the rim metal. */
function LeafGradient({ id, metal }: { id: string; metal: Metal }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={metal.hi} />
      <stop offset="0.55" stopColor={metal.mid} />
      <stop offset="1" stopColor={metal.lo} />
    </linearGradient>
  );
}

/** Watch-dial engraving: fine ellipses turned around the centre. */
function Guilloche({ r, color, count = 18 }: { r: number; color: string; count?: number }) {
  return (
    <g fill="none" stroke={color} strokeWidth={0.45} strokeOpacity={0.28}>
      {Array.from({ length: count }, (_, i) => (
        <ellipse key={i} cx={C} cy={C} rx={r} ry={r * 0.38} transform={`rotate(${(180 / count) * i} ${C} ${C})`} />
      ))}
    </g>
  );
}

/** The banner across the bottom carrying the invite count. */
function Ribbon({ label, fill, tail, text, showText }: { label: string; fill: string; tail: string; text: string; showText: boolean }) {
  const y = 74;
  return (
    <g>
      <path d={`M22 ${y + 3} L7 ${y + 5} L12 ${y + 11} L7 ${y + 17} L24 ${y + 15} Z`} fill={tail} />
      <path d={`M78 ${y + 3} L93 ${y + 5} L88 ${y + 11} L93 ${y + 17} L76 ${y + 15} Z`} fill={tail} />
      <path d={`M18 ${y} Q50 ${y + 5} 82 ${y} L82 ${y + 14} Q50 ${y + 19} 18 ${y + 14} Z`} fill={fill} />
      <path d={`M18 ${y + 1.6} Q50 ${y + 6.6} 82 ${y + 1.6}`} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={0.6} />
      {showText && (
        <text
          x={C}
          y={y + 12.2}
          textAnchor="middle"
          fill={text}
          fontSize={8.6}
          fontWeight={800}
          letterSpacing={0.5}
          fontFamily="var(--font-sans), system-ui, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** Raised lettering or a glyph: a dark copy underneath reads as depth. */
function Embossed({ children, light, dark }: { children: (fill: string) => ReactNode; light: string; dark: string }) {
  return (
    <g>
      <g transform="translate(0 1)" opacity={0.7}>
        {children(dark)}
      </g>
      {children(light)}
    </g>
  );
}

/** The slow band of light, clipped to the badge's body. */
function Shine({ clipId, delay }: { clipId: string; delay: number }) {
  return (
    <g clipPath={`url(#${clipId})`} style={{ mixBlendMode: "screen" }}>
      <rect
        className="animate-invite-badge-shine"
        x={35}
        y={-10}
        width={14}
        height={120}
        fill="#fff"
        fillOpacity={0.55}
        style={{ animationDelay: `${delay}s` }}
      />
    </g>
  );
}

export function InviteBadge({
  rung,
  className = "h-16 w-16",
  shine = false,
  shineDelay = 0,
  compact = false,
}: {
  rung: InviteBadgeRung;
  className?: string;
  /** A band of light every few seconds. Earned badges only. */
  shine?: boolean;
  shineDelay?: number;
  /** Drops the ribbon's number, for sizes too small to read it. */
  compact?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = (part: string) => `ib${rung}-${uid}-${part}`;
  const label = `${rung} INVITES`;

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={RUNGS[rung].name}>
      {rung === 3 && <EarlySupporter id={id} label={label} shine={shine} delay={shineDelay} compact={compact} />}
      {rung === 5 && <FeaturedBuilder id={id} label={label} shine={shine} delay={shineDelay} compact={compact} />}
      {rung === 10 && <SorzaOG id={id} label={label} shine={shine} delay={shineDelay} compact={compact} />}
      {rung === 25 && <FoundingCircle id={id} label={label} shine={shine} delay={shineDelay} compact={compact} />}
    </svg>
  );
}

interface ArtProps {
  id: (part: string) => string;
  label: string;
  shine: boolean;
  delay: number;
  compact: boolean;
}

/** Bronze medallion with a milled edge and a sun coming up over the
 * horizon: here early. */
function EarlySupporter({ id, label, shine, delay, compact }: ArtProps) {
  const body = "M50 14a32 32 0 1 1 0 64a32 32 0 1 1 0-64Z";
  return (
    <>
      <defs>
        <MetalGradient id={id("rim")} metal={BRONZE} />
        <LeafGradient id={id("leaf")} metal={BRONZE} />
        <FaceGradient id={id("face")} metal={BRONZE} />
        <clipPath id={id("clip")}>
          <path d={body} />
        </clipPath>
      </defs>
      <g>
        <Laurel r={38} pairs={5} span={80} fill={`url(#${id("leaf")})`} edge={BRONZE.lo} />
        <path d={body} fill={`url(#${id("rim")})`} />
        <circle cx={C} cy={46} r={29} fill="none" stroke={BRONZE.deep} strokeWidth={2.2} strokeDasharray="1.1 1.5" opacity={0.7} />
        <circle cx={C} cy={46} r={25} fill={`url(#${id("face")})`} stroke={BRONZE.deep} strokeWidth={1} />
        <g transform="translate(0 -4)">
          <Guilloche r={24} color={BRONZE.hi} />
        </g>
        <Embossed light={`url(#${id("rim")})`} dark={BRONZE.deep}>
          {(fill) => (
            <g fill={fill}>
              {/* The sun half over the horizon, rays fanning above it,
                  and the water below in two strokes. */}
              <path d="M41 53 A9 9 0 0 1 59 53" fill="none" stroke={fill} strokeWidth={2.6} strokeLinecap="round" />
              <path d="M45.5 53 A4.5 4.5 0 0 1 54.5 53 Z" />
              {[-150, -120, -90, -60, -30].map((deg) => {
                const a = (deg * Math.PI) / 180;
                return (
                  <path
                    key={deg}
                    d={`M${(C + 13.5 * Math.cos(a)).toFixed(2)} ${(53 + 13.5 * Math.sin(a)).toFixed(2)} L${(C + 19.5 * Math.cos(a)).toFixed(2)} ${(53 + 19.5 * Math.sin(a)).toFixed(2)}`}
                    stroke={fill}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                );
              })}
              <rect x={31} y={55.5} width={38} height={2} rx={1} />
              <rect x={38} y={59.5} width={24} height={1.6} rx={0.8} />
            </g>
          )}
        </Embossed>
        <ellipse cx={C} cy={30} rx={20} ry={9} fill="#fff" fillOpacity={0.1} />
        {shine && <Shine clipId={id("clip")} delay={delay} />}
      </g>
      <Ribbon label={label} fill={`url(#${id("rim")})`} tail={BRONZE.lo} text={BRONZE.deep} showText={!compact} />
    </>
  );
}

/** A chrome rosette around a star: in the spotlight. */
function FeaturedBuilder({ id, label, shine, delay, compact }: ArtProps) {
  const rosette = star(16, 38, 33, C, 46);
  return (
    <>
      <defs>
        <MetalGradient id={id("rim")} metal={CHROME} />
        <MetalGradient id={id("rim2")} metal={CHROME} angle={180} />
        <FaceGradient id={id("face")} metal={CHROME} />
        <linearGradient id={id("beam")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.35} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <clipPath id={id("clip")}>
          <path d={rosette} />
        </clipPath>
        <clipPath id={id("faceclip")}>
          <circle cx={C} cy={46} r={25} />
        </clipPath>
      </defs>
      <path d={rosette} fill={`url(#${id("rim")})`} stroke={CHROME.lo} strokeWidth={0.6} />
      <circle cx={C} cy={46} r={29.5} fill={`url(#${id("rim2")})`} />
      <circle cx={C} cy={46} r={25} fill={`url(#${id("face")})`} stroke={CHROME.deep} strokeWidth={1} />
      <g clipPath={`url(#${id("faceclip")})`}>
        <g transform="translate(0 -4)">
          <Guilloche r={25} color={CHROME.hi} count={22} />
        </g>
        {/* The spotlight falling on the star. */}
        <path d="M44 20 L56 20 L68 72 L32 72 Z" fill={`url(#${id("beam")})`} />
      </g>
      <Embossed light={`url(#${id("rim")})`} dark={CHROME.deep}>
        {(fill) => <path d={star(5, 15, 6.4, C, 48)} fill={fill} stroke={fill === CHROME.deep ? "none" : CHROME.lo} strokeWidth={0.5} />}
      </Embossed>
      <ellipse cx={C} cy={28} rx={20} ry={8} fill="#fff" fillOpacity={0.12} />
      {shine && <Shine clipId={id("clip")} delay={delay} />}
      <Ribbon label={label} fill={`url(#${id("rim")})`} tail={CHROME.lo} text={CHROME.deep} showText={!compact} />
    </>
  );
}

/** A gold shield under a crown, wreathed, with OG struck into it. */
function SorzaOG({ id, label, shine, delay, compact }: ArtProps) {
  const shield = "M50 18 L74 25.5 V44 C74 59 64 69 50 74 C36 69 26 59 26 44 V25.5 Z";
  const face = "M50 23.5 L69 29.5 V44 C69 56 61.5 64 50 68.5 C38.5 64 31 56 31 44 V29.5 Z";
  const crown = "M37 19 L40 8 L45.5 14 L50 5 L54.5 14 L60 8 L63 19 Z";
  return (
    <>
      <defs>
        <MetalGradient id={id("rim")} metal={GOLD} />
        <LeafGradient id={id("leaf")} metal={GOLD} />
        <FaceGradient id={id("face")} metal={GOLD} />
        <clipPath id={id("clip")}>
          <path d={shield} />
          <path d={crown} />
        </clipPath>
        <clipPath id={id("faceclip")}>
          <path d={face} />
        </clipPath>
      </defs>
      <Laurel r={38} pairs={7} span={112} fill={`url(#${id("leaf")})`} edge={GOLD.lo} />
      <path d={crown} fill={`url(#${id("rim")})`} stroke={GOLD.lo} strokeWidth={0.6} strokeLinejoin="round" />
      {[40, 50, 60].map((x, i) => (
        <circle key={x} cx={x} cy={i === 1 ? 5 : 8} r={1.6} fill={GOLD.hi} stroke={GOLD.lo} strokeWidth={0.4} />
      ))}
      <path d={shield} fill={`url(#${id("rim")})`} stroke={GOLD.lo} strokeWidth={0.6} />
      <path d={face} fill={`url(#${id("face")})`} stroke={GOLD.deep} strokeWidth={0.8} />
      <g clipPath={`url(#${id("faceclip")})`}>
        <Guilloche r={26} color={GOLD.hi} count={20} />
      </g>
      <Embossed light={`url(#${id("rim")})`} dark={GOLD.deep}>
        {(fill) => (
          <text
            x={C}
            y={54}
            textAnchor="middle"
            fill={fill}
            fontSize={22}
            fontWeight={900}
            letterSpacing={-1.2}
            fontFamily="var(--font-sans), system-ui, sans-serif"
          >
            OG
          </text>
        )}
      </Embossed>
      <path d="M33 31 L50 25.5 L67 31" fill="none" stroke="#fff" strokeOpacity={0.25} strokeWidth={0.8} />
      {shine && <Shine clipId={id("clip")} delay={delay} />}
      <Ribbon label={label} fill={`url(#${id("rim")})`} tail={GOLD.lo} text={GOLD.deep} showText={!compact} />
    </>
  );
}

/** Obsidian, inlaid with gold: a ring of 25 marks around a cut gem, one
 * for each person brought in. */
function FoundingCircle({ id, label, shine, delay, compact }: ArtProps) {
  const body = polygon(8, 33, 22.5, 46);
  const inner = polygon(8, 27.5, 22.5, 46);
  return (
    <>
      <defs>
        <MetalGradient id={id("gold")} metal={GOLD} />
        <LeafGradient id={id("leaf")} metal={GOLD} />
        <MetalGradient id={id("body")} metal={OBSIDIAN} />
        <FaceGradient id={id("face")} metal={OBSIDIAN} />
        {/* The gem's fire: it catches every colour. */}
        <linearGradient id={id("gem")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c8fbff" />
          <stop offset="0.3" stopColor="#7cc8ff" />
          <stop offset="0.55" stopColor="#d9a8ff" />
          <stop offset="0.8" stopColor="#ffd38a" />
          <stop offset="1" stopColor="#9ffff0" />
        </linearGradient>
        <clipPath id={id("clip")}>
          <path d={body} />
        </clipPath>
      </defs>
      <Laurel r={39} pairs={8} span={124} fill={`url(#${id("leaf")})`} edge={GOLD.lo} />
      <path d={body} fill={`url(#${id("body")})`} stroke={`url(#${id("gold")})`} strokeWidth={2} strokeLinejoin="round" />
      <path d={inner} fill={`url(#${id("face")})`} stroke={GOLD.lo} strokeWidth={0.6} strokeLinejoin="round" />
      {/* 25 marks, one per invite. */}
      <g stroke={`url(#${id("gold")})`} strokeWidth={1.3} strokeLinecap="round">
        {Array.from({ length: 25 }, (_, i) => {
          const a = ((360 / 25) * i - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1={C + 20 * Math.cos(a)}
              y1={46 + 20 * Math.sin(a)}
              x2={C + 23.5 * Math.cos(a)}
              y2={46 + 23.5 * Math.sin(a)}
            />
          );
        })}
      </g>
      <circle cx={C} cy={46} r={17.5} fill="none" stroke={GOLD.lo} strokeWidth={0.5} />
      {/* A brilliant cut seen from the side: table, crown, pavilion. */}
      <g transform="translate(0 1)">
        <path d="M39 42 L44 36 H56 L61 42 L50 58 Z" fill={`url(#${id("gem")})`} stroke="#fff" strokeOpacity={0.7} strokeWidth={0.5} strokeLinejoin="round" />
        <g fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.45}>
          <path d="M39 42 H61" />
          <path d="M44 36 L47 42 L50 36 L53 42 L56 36" />
          <path d="M47 42 L50 58 L53 42" />
        </g>
        <path d="M44 36 H56 L53 42 H47 Z" fill="#fff" fillOpacity={0.35} />
      </g>
      <ellipse cx={C} cy={27} rx={19} ry={7} fill="#fff" fillOpacity={0.07} />
      {shine && <Shine clipId={id("clip")} delay={delay} />}
      <Ribbon label={label} fill={`url(#${id("body")})`} tail={OBSIDIAN.lo} text={GOLD.hi} showText={!compact} />
    </>
  );
}
