import type { SVGProps } from "react";

/** The seal's outline: twelve scallops around a circle (arcs between
 * points on r=9.5, each bulging 1.45 out) — the rosette edge of an
 * embossed certificate seal rather than a plain dot, so it still reads as
 * a seal at 13px. Computed once and frozen as a string so the server and
 * the client render byte-identical markup. */
export const VERIFIED_SEAL_PATH =
  "M14.46 2.82A2.81 2.81 0 0 1 18.72 5.28A2.81 2.81 0 0 1 21.18 9.54A2.81 2.81 0 0 1 21.18 14.46A2.81 2.81 0 0 1 18.72 18.72A2.81 2.81 0 0 1 14.46 21.18A2.81 2.81 0 0 1 9.54 21.18A2.81 2.81 0 0 1 5.28 18.72A2.81 2.81 0 0 1 2.82 14.46A2.81 2.81 0 0 1 2.82 9.54A2.81 2.81 0 0 1 5.28 5.28A2.81 2.81 0 0 1 9.54 2.82A2.81 2.81 0 0 1 14.46 2.82Z";

export const VERIFIED_CHECK_PATH = "M7.7 12.4 10.65 15.3 16.4 9.2";

/** The blue verified seal that sits beside a verified account's name
 * everywhere that name appears — profile, feed, comments, lists, inbox,
 * leaderboard. One component so it is the same mark in every place;
 * that sameness is what lets people recognise it. Server-safe (no
 * hooks); the profile's tappable, animated version is VerifiedSeal in
 * features/profile/verified-credential.tsx.
 *
 * Over photos and video pass `onMedia`: a soft shadow keeps the seal's
 * edge from dissolving into a bright sky. */
export function VerifiedBadge({
  className = "h-4 w-4",
  label = "Verified account",
  onMedia = false,
  ...props
}: Omit<SVGProps<SVGSVGElement>, "children"> & {
  label?: string;
  onMedia?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={label}
      className={`inline-block flex-shrink-0 ${onMedia ? "drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)]" : ""} ${className}`}
      {...props}
    >
      <path d={VERIFIED_SEAL_PATH} fill="var(--verified)" />
      <path
        d={VERIFIED_CHECK_PATH}
        fill="none"
        stroke="var(--verified-ink)"
        strokeWidth={2.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
