import Image from "next/image";
import Link from "next/link";
import { APP_STORE_URL } from "@/lib/app-store";
import type { InAppBrowser } from "@/lib/in-app-browser";
import { AppleIcon, ArrowUpIcon } from "@/components/ui/icons";

const EMBLEMS = ["bronze", "gold", "emerald", "diamond", "cosmic"] as const;

/**
 * sorza.net/get (and /download): the link for bios, videos and QR codes.
 *
 * A real page on purpose, never a redirect. TikTok's in-app browser
 * refuses to hand a redirect off to the App Store ("Action can't be
 * completed"), which left people on a blank screen. Here they land on
 * SORZA, see a plain App Store button, and get told how to break out to
 * their real browser if the button does nothing. Visitors inside a
 * social app's browser get that instruction as a callout.
 */
export function GetAppPage({ inApp, platform }: { inApp: InAppBrowser | null; platform: "ios" | "android" | "other" }) {
  const browser = platform === "ios" ? "Safari" : platform === "android" ? "Chrome" : "Safari/Chrome";
  const escape = `If tapping doesn't work, tap the three dots (•••) in the top corner and select 'Open in ${browser}'.`;

  return (
    <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col items-center px-5 pb-14 pt-10 text-center">
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
        What&apos;s your car rated?
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

        <a
          href={APP_STORE_URL}
          className="pressable flex h-[3.75rem] w-full items-center justify-center gap-3 rounded-full bg-foreground text-background"
        >
          <AppleIcon className="h-7 w-7" />
          <span className="flex flex-col items-start leading-none">
            <span className="text-[0.6875rem] font-medium tracking-[0.02em] opacity-80">Download on the</span>
            <span className="mt-1 text-[1.25rem] font-semibold tracking-[-0.01em]">App Store</span>
          </span>
        </a>
      </div>

      <p className="mt-5 text-[0.8125rem] text-muted">
        Not on iPhone?{" "}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          Use SORZA on the web
        </Link>
      </p>
    </div>
  );
}
