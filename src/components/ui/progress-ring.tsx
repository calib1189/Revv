import type { CSSProperties, ReactNode } from "react";

/** An activity-ring style progress ring — thick round-capped stroke over
 * a faint track of the same hue, starting at twelve o'clock and drawing
 * itself in on mount (`animate-ring-draw`, globals.css). Pure SVG + CSS,
 * so it works in a Server Component with no client JS.
 *
 * For a build's rank (profile photo, garage Best Build), use RankFrame's
 * animated tier ring instead — this is for plain progress.
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
}: {
  /** 0–1. Clamped. */
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
  className?: string;
  /** Accessible description, e.g. "12 of 20". */
  label?: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  // Unique per ring so two rings on one page never share a gradient.
  const gradientId = `ring-${Math.round(clamped * 1e4)}-${size}-${stroke}-${color.replace(/[^a-z0-9]/gi, "")}`;
  const center = size / 2;

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
      </svg>
      {/* No z-index: the SVG is an earlier absolute sibling, so paint
          order already puts this on top — and a z-10 here could draw
          over the sticky top bar when scrolled beneath it. */}
      {children && <div className="relative flex items-center justify-center">{children}</div>}
    </div>
  );
}
