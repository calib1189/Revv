import Image from "next/image";
import Link from "next/link";
import type { InAppBrowser } from "@/lib/in-app-browser";
import { ArrowUpIcon } from "@/components/ui/icons";
import { StoreBadges } from "@/features/landing/store-badges";
import { DownloadTracker } from "@/features/landing/download-tracker";

const EMBLEMS = ["bronze", "gold", "emerald", "diamond", "cosmic"] as const;

/**
 * sorza.net/get (and /download): the link for bios, videos and QR codes.
 *
 * A real page on purpose, never a redirect. TikTok's in-app browser
 * refuses to hand a redirect off to the App Store ("Action can't be
 * completed"), which left people on a blank screen. Here they land on
 * SORZA, see the App Store and Google Play badges (their own store
 * first), and get told how to break out to
 * their real browser if the button does nothing. Visitors inside a
 * social app's browser get that instruction as a callout.
 */
export function GetAppPage({ inApp, platform }: { inApp: InAppBrowser | null; platform: "ios" | "android" | "other" }) {
  const browser = platform === "ios" ? "Safari" : platform === "android" ? "Chrome" : "Safari/Chrome";
  const escape = `If tapping doesn't work, tap the three dots (•••) in the top corner and select 'Open in ${browser}'.`;

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center px-5 pb-14 pt-10 text-center">
      <DownloadTracker platform={platform} inApp={inApp} />
      {inApp && (
        <div className="pointer-events-none absolute right-3 top-2 flex items-center gap-1.5 text-accent" aria-hidden="true">
          <span className="text-[0.75rem] font-semibold">Tap •••</span>
          <ArrowUpIcon className="h-5 w-5 rotate-45" />
        </div>
      )}

      <div className="flex items-center justify-center -space-x-3">
        {EMBLEMS.map((tier, i) => (
          <span
            key={tier}
            className="relative h-14 w-14 drop-shadow-[0_6px_14px_rgba(0,0,0,0.55)]"
            style={{ zIndex: i === 2 ? 3 : i === 1 || i === 3 ? 2 : 1, transform: `scale(${i === 2 ? 1.25 : i === 1 || i === 3 ? 1.08 : 0.92})` }}
          >
            <Image src={`/ranks/${tier}.webp`} alt="" fill sizes="70px" className="object-contain" priority />
          </span>
        ))}
      </div>

      <h1 className="mt-7 text-balance text-[2.25rem] font-bold leading-[1.02] tracking-[-0.035em]">
        What&apos;s your ride rated?
      </h1>
      <p className="mt-3 max-w-[34ch] text-[0.9375rem] leading-relaxed text-muted">
        Add your build, get a real SORZA score out of 100, and see where you rank on the leaderboard.
      </p>

      <div className="mt-8 flex w-full flex-col gap-3">
        {inApp ? (
          <div className="rounded-[18px] border border-accent/40 bg-accent/10 px-4 py-3.5 text-left">
            <p className="text-[0.8125rem] font-semibold text-accent">You&apos;re in {inApp}&apos;s browser</p>
            <p className="mt-1 text-[0.875rem] leading-relaxed">{escape}</p>
          </div>
        ) : (
          <p className="px-2 text-[0.8125rem] leading-relaxed text-muted">{escape}</p>
        )}

        <StoreBadges platform={platform} className="justify-center pt-1" />
      </div>

      <p className="mt-5 text-[0.8125rem] text-muted">
        On a computer?{" "}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          Use SORZA on the web
        </Link>
      </p>
    </div>
  );
}
