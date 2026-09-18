import type { CSSProperties, ReactNode } from "react";

/** An activity-ring style progress ring — thick round-capped stroke over
 * a faint track of the same hue, starting at twelve o'clock and drawing
 * itself in on mount (`animate-ring-draw`, globals.css). Pure SVG + CSS,
 * so it works in a Server Component with no client JS.
 *
 * `glint` adds a soft highlight that travels continuously around the
 * filled arc — masked to the arc itself, so it animates the ring without
 * ever suggesting a different value. With `value` 0 it orbits the empty
 * track instead, faintly. Disabled under prefers-reduced-motion.
 *
 * `color` accepts any CSS color, including var(--tier-*) — the gradient
 * stops are set through `style`, which is where custom properties
 * resolve inside SVG. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  color,
  children,
  className = "",
  label,
  glint = false,
}: {
  /** 0–1. Clamped. */
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
  className?: string;
  /** Accessible description, e.g. "Best build 86.50 out of 100". */
  label?: string;
  glint?: boolean;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  // Unique per ring so two rings on one page never share a gradient/mask.
  const baseId = `ring-${Math.round(clamped * 1e4)}-${size}-${stroke}-${color.replace(/[^a-z0-9]/gi, "")}`;
  const gradientId = `${baseId}-g`;
  const maskId = `${baseId}-m`;
  const center = size / 2;

  const glintCircle = (
    <g className="animate-ring-glint" style={{ transformOrigin: "50% 50%", transformBox: "view-box" }}>
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        stroke="white"
        strokeOpacity={clamped > 0 ? 0.75 : 0.35}
        strokeDasharray={`${circumference * 0.12} ${circumference}`}
      />
    </g>
  );

  return (
    <div
      className={`relative inline-flex flex-shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: `color-mix(in srgb, ${color} 72%, white)` }} />
            <stop offset="100%" style={{ stopColor: color }} />
          </linearGradient>
          {glint && clamped > 0 && (
            <mask id={maskId}>
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                strokeLinecap="round"
                stroke="white"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </mask>
          )}
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          style={{ stroke: color, opacity: 0.16 }}
        />
        {clamped > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={`url(#${gradientId})`}
            className="animate-ring-draw"
            style={
              {
                strokeDasharray: circumference,
                strokeDashoffset: offset,
                "--ring-from": circumference,
              } as CSSProperties
            }
          />
        )}
        {glint && (clamped > 0 ? <g mask={`url(#${maskId})`}>{glintCircle}</g> : glintCircle)}
      </svg>
      {children && <div className="relative z-10 flex items-center justify-center">{children}</div>}
    </div>
  );
}
