import type { Plant, WallArt } from "@/lib/garage/layout";

/** Original, flat-vector decor art — no photos, no third-party assets, so
 * nothing here carries a licensing question. */

export function PlantDecor({ variant }: { variant: Plant }) {
  if (variant === "none") return null;

  return (
    <svg viewBox="0 0 60 90" className="garage-decor-plant" aria-hidden="true">
      <path d="M18 70 L42 70 L38 88 L22 88 Z" fill="#3a3226" />
      <rect x="16" y="66" width="28" height="6" rx="1.5" fill="#4a3f30" />
      {variant === "fern" ? (
        <g stroke="#4f9d6e" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M30 68 C30 50 15 45 8 30" />
          <path d="M30 68 C30 45 45 40 52 22" />
          <path d="M30 68 C30 40 30 30 30 10" />
          <path d="M30 68 C30 48 20 38 14 45" />
          <path d="M30 68 C30 48 40 38 46 45" />
        </g>
      ) : (
        <g stroke="#3f8f5c" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M30 68 L30 20" />
          <path d="M30 35 C20 30 10 32 4 20" />
          <path d="M30 35 C40 30 50 32 56 20" />
          <path d="M30 22 C22 16 14 16 8 6" />
          <path d="M30 22 C38 16 46 16 52 6" />
        </g>
      )}
    </svg>
  );
}

export function WallArtDecor({ variant }: { variant: WallArt }) {
  if (variant === "none") return null;

  if (variant === "neon") {
    return (
      <svg
        viewBox="0 0 160 50"
        className="garage-decor-wallart garage-decor-neon"
        aria-hidden="true"
      >
        <text
          x="80"
          y="34"
          textAnchor="middle"
          fontSize="30"
          fontWeight="700"
          fill="none"
          stroke="#ff4433"
          strokeWidth="2"
        >
          REVV
        </text>
      </svg>
    );
  }

  if (variant === "pegboard") {
    const dots = Array.from({ length: 8 * 4 }, (_, i) => ({
      cx: 10 + (i % 8) * 18,
      cy: 10 + Math.floor(i / 8) * 14,
    }));
    return (
      <svg viewBox="0 0 150 60" className="garage-decor-wallart" aria-hidden="true">
        <rect
          x="0"
          y="0"
          width="150"
          height="60"
          rx="4"
          fill="rgb(255 255 255 / 0.04)"
          stroke="rgb(255 255 255 / 0.1)"
        />
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r="1.4" fill="rgb(255 255 255 / 0.25)" />
        ))}
        <path
          d="M20 20 L20 45 M20 45 L12 45 M20 45 L28 45"
          stroke="rgb(255 255 255 / 0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="70" cy="30" r="12" fill="none" stroke="rgb(255 255 255 / 0.3)" strokeWidth="2.5" />
        <rect x="105" y="15" width="30" height="8" rx="2" fill="rgb(255 255 255 / 0.25)" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 60" className="garage-decor-wallart" aria-hidden="true">
      <rect x="2" y="2" width="52" height="56" rx="2" fill="rgb(255 68 51 / 0.12)" stroke="rgb(255 255 255 / 0.15)" />
      <rect x="66" y="2" width="52" height="56" rx="2" fill="rgb(255 255 255 / 0.06)" stroke="rgb(255 255 255 / 0.15)" />
      <path
        d="M10 45 L25 25 L36 38 L46 20"
        stroke="rgb(255 68 51 / 0.5)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="92" cy="22" r="8" fill="rgb(255 255 255 / 0.15)" />
    </svg>
  );
}
