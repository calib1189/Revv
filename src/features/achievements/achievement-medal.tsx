import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import type { AchievementDef } from "@/lib/achievements/catalog";
import { medalDesign, type MedalPattern, type MedalShape } from "@/lib/achievements/medal";

// Every medal is drawn on a 64x64 grid, centred on (32, 32).
const C = 32;

function polygon(sides: number, radius: number, rotationDeg: number): string {
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = ((rotationDeg + (360 / sides) * i) * Math.PI) / 180;
    return `${(C + radius * Math.cos(a)).toFixed(2)} ${(C + radius * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts.join("L")}Z`;
}

/** Alternating radii: gear teeth (flat-topped) or a rosette's points. */
function toothed(count: number, outer: number, inner: number, flat: boolean): string {
  const step = (Math.PI * 2) / count;
  const pts: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = i * step - Math.PI / 2;
    const at = (angle: number, r: number) =>
      `${(C + r * Math.cos(angle)).toFixed(2)} ${(C + r * Math.sin(angle)).toFixed(2)}`;
    if (flat) {
      pts.push(at(a - step * 0.22, outer), at(a + step * 0.22, outer), at(a + step * 0.32, inner), at(a + step * 0.68, inner));
    } else {
      pts.push(at(a, outer), at(a + step / 2, inner));
    }
  }
  return `M${pts.join("L")}Z`;
}

const SHAPES: Record<MedalShape, string> = {
  // A wheel's centre cap: a plain disc, with a milled edge drawn on top.
  cap: "M32 3a29 29 0 1 1 0 58a29 29 0 1 1 0-58Z",
  shield: "M32 3 L57 11.5 V29 C57 44.5 46.5 55.5 32 61 C17.5 55.5 7 44.5 7 29 V11.5 Z",
  // Flat top and bottom, like a nut seen down the bolt.
  nut: polygon(6, 30, 0),
  gear: toothed(10, 30.5, 25, true),
  crest: toothed(16, 30.5, 26.5, false),
};

/** The enamel face inside the rim, where the icon sits. */
const FACES: Record<MedalShape, string> = {
  cap: "M32 10a22 22 0 1 1 0 44a22 22 0 1 1 0-44Z",
  shield: "M32 9.5 L51 16 V29 C51 41 43 49.5 32 54 C21 49.5 13 41 13 29 V16 Z",
  nut: polygon(6, 23.5, 0),
  gear: "M32 11a21 21 0 1 1 0 42a21 21 0 1 1 0-42Z",
  crest: "M32 9a23 23 0 1 1 0 46a23 23 0 1 1 0-46Z",
};

function mix(hex: string, target: number, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.round(v + (target - v) * amount);
  };
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

function Pattern({ pattern }: { pattern: MedalPattern }) {
  const stroke = { stroke: "#fff", strokeOpacity: 0.13, fill: "none" } as const;
  switch (pattern) {
    case "rays":
      return (
        <g {...stroke} strokeWidth={1.4}>
          {Array.from({ length: 18 }, (_, i) => {
            const a = (i / 18) * Math.PI * 2;
            return <line key={i} x1={C} y1={C} x2={C + 40 * Math.cos(a)} y2={C + 40 * Math.sin(a)} />;
          })}
        </g>
      );
    case "rings":
      return (
        <g {...stroke} strokeWidth={1}>
          {[5, 9, 13, 17, 21].map((r) => (
            <circle key={r} cx={C} cy={C} r={r} />
          ))}
        </g>
      );
    case "checker":
      // A chequered flag.
      return (
        <g fill="#fff" fillOpacity={0.1}>
          {Array.from({ length: 64 }, (_, i) => {
            const x = i % 8;
            const y = Math.floor(i / 8);
            return (x + y) % 2 === 0 ? <rect key={i} x={x * 8} y={y * 8} width={8} height={8} /> : null;
          })}
        </g>
      );
    case "carbon":
      // Carbon-fibre twill.
      return (
        <g fill="#fff" fillOpacity={0.09}>
          {Array.from({ length: 256 }, (_, i) => {
            const x = i % 16;
            const y = Math.floor(i / 16);
            const vertical = (x + y) % 2 === 0;
            return vertical ? (
              <rect key={i} x={x * 4 + 1} y={y * 4} width={2} height={4} />
            ) : (
              <rect key={i} x={x * 4} y={y * 4 + 1} width={4} height={2} />
            );
          })}
        </g>
      );
    case "knurl":
      // The cross-hatch machined into a grip.
      return (
        <g {...stroke} strokeWidth={0.9}>
          {Array.from({ length: 14 }, (_, i) => (
            <g key={i}>
              <line x1={i * 6 - 20} y1={0} x2={i * 6 + 44} y2={64} />
              <line x1={i * 6 + 20} y1={0} x2={i * 6 - 44} y2={64} />
            </g>
          ))}
        </g>
      );
  }
}

/**
 * An achievement's medal. Tier milestones show the tier's own crest;
 * everything else is drawn from its medalDesign (lib/achievements/
 * medal.ts), so each one is distinct without bespoke artwork.
 *
 * `compact` drops the number plate, for sizes too small to read it.
 */
export function AchievementMedal({
  achievement,
  className = "h-14 w-14",
  compact = false,
}: {
  achievement: AchievementDef;
  className?: string;
  compact?: boolean;
}) {
  if (achievement.tier) {
    const TierIcon = RANK_MATERIAL_ICONS[achievement.tier];
    return <TierIcon className={className} />;
  }

  const { shape, color, pattern, mark } = medalDesign(achievement);
  const Icon = achievement.icon;
  const id = `medal-${achievement.id}`;
  const showMark = mark !== null && !compact;
  // The plate covers the face's lower edge, so the icon rides higher.
  const iconY = showMark ? 15 : 19.5;
  const plateWidth = mark ? 9 + mark.length * 5.1 : 0;

  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={achievement.name}>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(color, 255, 0.45)} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="1" stopColor={mix(color, 0, 0.55)} />
        </linearGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={mix(color, 0, 0.5)} />
          <stop offset="1" stopColor={mix(color, 0, 0.78)} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={FACES[shape]} />
        </clipPath>
      </defs>

      <path d={SHAPES[shape]} fill={`url(#${id}-rim)`} />
      {shape === "cap" && (
        // Milled edge.
        <circle cx={C} cy={C} r={26.5} fill="none" stroke={mix(color, 0, 0.45)} strokeWidth={2.4} strokeDasharray="1.2 1.6" />
      )}
      {shape === "gear" && <circle cx={C} cy={C} r={23.4} fill={mix(color, 0, 0.35)} />}

      <path d={FACES[shape]} fill={`url(#${id}-face)`} stroke={mix(color, 0, 0.7)} strokeWidth={1} />
      <g clipPath={`url(#${id}-clip)`}>
        <Pattern pattern={pattern} />
        {/* Light off the top of the enamel. */}
        <ellipse cx={C} cy={8} rx={26} ry={16} fill="#fff" fillOpacity={0.12} />
      </g>

      {Icon && (
        <Icon
          x={20}
          y={iconY}
          width={24}
          height={24}
          color="#fff"
          strokeWidth={2}
          aria-hidden
        />
      )}

      {showMark && (
        <g>
          <rect
            x={C - plateWidth / 2}
            y={44}
            width={plateWidth}
            height={12}
            rx={3}
            fill="#0b0b0c"
            stroke={mix(color, 255, 0.2)}
            strokeWidth={1}
          />
          <text
            x={C}
            y={52.6}
            textAnchor="middle"
            fill="#fff"
            fontSize={8}
            fontWeight={700}
            fontFamily="var(--font-mono), ui-monospace, monospace"
            letterSpacing={-0.2}
          >
            {mark}
          </text>
        </g>
      )}
    </svg>
  );
}
