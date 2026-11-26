import Image from "next/image";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-store";

/**
 * The official App Store and Google Play badges, unmodified (both
 * companies require their own artwork), at the same height as each other.
 * The visitor's own store comes first; on a computer both show, App Store
 * first.
 */
export function StoreBadges({
  platform,
  height = 52,
  className = "",
}: {
  platform: "ios" | "android" | "other";
  height?: number;
  className?: string;
}) {
  const apple = (
    <a key="apple" href={APP_STORE_URL} className="pressable block" aria-label="Download on the App Store">
      <Image
        src="/badges/app-store.svg"
        alt="Download on the App Store"
        width={Math.round(height * (119.66407 / 40))}
        height={height}
        unoptimized
        priority
      />
    </a>
  );
  const google = (
    <a key="google" href={PLAY_STORE_URL} className="pressable block" aria-label="Get it on Google Play">
      <Image
        src="/badges/google-play.png"
        alt="Get it on Google Play"
        width={Math.round(height * (564 / 168))}
        height={height}
        unoptimized
        priority
      />
    </a>
  );
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {platform === "android" ? [google, apple] : [apple, google]}
    </div>
  );
}
