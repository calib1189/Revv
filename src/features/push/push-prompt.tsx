"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CheckIcon } from "@/components/ui/icons";
import { APP_STORE_URL } from "@/lib/app-store";
import { isAnnouncementBlockedPath } from "@/lib/announcements";
import { useHideBottomNav } from "@/lib/ui/use-hide-bottom-nav";
import { enableNativePush, getNativePushPermission, isNativeApp, isNativePushAvailable } from "@/lib/native/push";

/** Set once the sheet has shown on this phone, so it only ever shows once. */
const SHOWN_KEY = "sorza.pushPrompt.v1";
/** 1.2 went live this day. Accounts from before it had an app that
 * couldn't turn notifications on, and the sheet owns up to that. */
const PUSH_FIXED_AT = Date.parse("2026-11-24T00:00:00Z");
/** iOS Settings, opened on SORZA's own page (where Notifications is). */
const IOS_APP_SETTINGS_URL = "app-settings:";
const SHOW_DELAY_MS = 900;
const CLOSE_AFTER_ON_MS = 1100;

type Mode = "ask" | "settings" | "update";
type Phase = "idle" | "busy" | "on";

const subscribeNever = () => () => {};

function alreadyShown(): boolean {
  try {
    return window.localStorage.getItem(SHOWN_KEY) !== null;
  } catch {
    // Storage unreadable: better to never show it than to show it every launch.
    return true;
  }
}

function markShown() {
  try {
    window.localStorage.setItem(SHOWN_KEY, new Date().toISOString());
  } catch {
    // Nothing to do; alreadyShown() errs on the side of not showing.
  }
}

/**
 * Once, the first time someone opens the iPhone app without notifications
 * on: a sheet that says so plainly and turns them on in one tap. It asks
 * first and lets iOS ask second, so the one-and-only system prompt comes
 * when someone has just said yes.
 *
 * - Never asked: Enable shows the iOS "Allow" prompt.
 * - Said "Don't Allow" before: iOS won't ask again, so the button opens
 *   SORZA's page in Settings instead.
 * - An app from before 1.2 (no push in it at all): the button updates it.
 */
export function PushPrompt({ accountCreatedAt }: { accountCreatedAt: string }) {
  const pathname = usePathname();
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [closing, setClosing] = useState(false);
  const open = mode !== null;
  useHideBottomNav(open);

  useEffect(() => {
    if (isAnnouncementBlockedPath(pathname) || alreadyShown()) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (!(await isNativeApp())) return;
          let next: Mode;
          if (!(await isNativePushAvailable())) next = "update";
          else {
            const permission = await getNativePushPermission();
            if (permission === "granted") return;
            next = permission === "denied" ? "settings" : "ask";
          }
          if (cancelled || alreadyShown()) return;
          markShown();
          setMode(next);
        } catch {
          // No sheet rather than a broken one.
        }
      })();
    }, SHOW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname]);

  function close() {
    setClosing(true);
    setTimeout(() => setMode(null), 260);
  }

  async function enable() {
    if (mode === "update") {
      window.location.href = APP_STORE_URL;
      return close();
    }
    if (mode === "settings") {
      window.location.href = IOS_APP_SETTINGS_URL;
      return close();
    }
    setPhase("busy");
    const result = await enableNativePush().catch(() => null);
    if (result?.ok) {
      setPhase("on");
      setTimeout(close, CLOSE_AFTER_ON_MS);
    } else {
      // "Don't Allow" on the iOS prompt is an answer; respect it.
      close();
    }
  }

  if (!isClient || !open) return null;

  const ownedUp = Date.parse(accountCreatedAt) < PUSH_FIXED_AT;
  const title =
    mode === "update"
      ? "Update SORZA to get notifications"
      : ownedUp
        ? "Your notifications never turned on"
        : "Turn on notifications";
  const body =
    mode === "update"
      ? "Your version of the app can't send them. That was a bug on our side, and it's fixed in the latest update."
      : ownedUp
        ? "That was a bug on our side, and it's fixed. Turn them on so you never miss what's happening with your car."
        : "Know the moment something happens with your car.";
  const button =
    phase === "on" ? "You're all set" : mode === "update" ? "Update SORZA" : mode === "settings" ? "Open Settings" : "Enable notifications";

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${closing ? "opacity-0" : "animate-fade-in"}`}
      />
      <div
        className={`glass-raised relative w-full max-w-lg rounded-t-[32px] px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 transition-transform duration-300 ease-[var(--ease-ios)] sm:mb-6 sm:rounded-[32px] ${
          closing ? "translate-y-full" : "animate-sheet-up"
        }`}
      >
        <span className="mx-auto block h-1 w-9 rounded-full bg-foreground/15" />

        {/* What they'd be getting, as it would look on the lock screen. */}
        {/* What they'd be getting, as it would look on the lock screen:
            one notification, with another stacked under it the way iOS
            groups them. */}
        <div className="relative mx-auto mt-8 h-[92px] w-full max-w-[320px]">
          <div
            aria-hidden="true"
            className="animate-section-rise absolute inset-x-4 top-3 h-[78px] rounded-[22px] bg-[color-mix(in_srgb,var(--surface-raised),white_3%)] ring-1 ring-foreground/[0.05]"
            style={{ animationDelay: "240ms" }}
          />
          <LockScreenCard
            className="absolute inset-x-0 top-0"
            delay={120}
            title="Your streak ends tonight"
            body="Open SORZA to keep it going."
          />
        </div>

        <h2 className="mt-7 text-balance text-center text-[1.625rem] font-bold leading-[1.15] tracking-[-0.03em]">
          {title}
        </h2>
        <p className="mx-auto mt-2.5 max-w-[22rem] text-balance text-center text-[0.9375rem] leading-relaxed text-muted">
          {body}
        </p>
        {mode === "settings" && (
          <p className="mx-auto mt-3 max-w-[22rem] text-center text-[0.8125rem] text-muted/80">
            In Settings, tap Notifications and turn on Allow Notifications.
          </p>
        )}

        <div className="mt-7 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => void enable()}
            disabled={phase !== "idle"}
            className={`pressable flex h-14 w-full items-center justify-center gap-2 rounded-full text-[1.0625rem] font-semibold text-white transition-colors duration-300 ${
              phase === "on" ? "bg-success" : "bg-accent shadow-[0_10px_30px_-12px_rgb(255_68_51/0.7)]"
            }`}
          >
            {phase === "busy" ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                {phase === "on" && <CheckIcon className="h-5 w-5" strokeWidth={2.75} />}
                {button}
              </>
            )}
          </button>
          {phase === "idle" && (
            <button type="button" onClick={close} className="h-12 w-full text-[0.9375rem] font-medium text-muted">
              Not now
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LockScreenCard({
  title,
  body,
  className,
  delay,
}: {
  title: string;
  body: string;
  className: string;
  delay: number;
}) {
  return (
    <div className={className}>
      <div
        className="animate-section-rise flex h-[78px] items-center gap-3 rounded-[22px] bg-[color-mix(in_srgb,var(--surface-raised),white_8%)] px-3.5 shadow-[0_12px_30px_-14px_rgb(0_0_0/0.7)] ring-1 ring-foreground/[0.07]"
        style={{ animationDelay: `${delay}ms` }}
      >
        <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 flex-shrink-0 rounded-[9px]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.8125rem] font-semibold">SORZA</p>
            <p className="text-[0.75rem] text-muted">now</p>
          </div>
          <p className="truncate text-[0.8125rem] font-semibold leading-snug">{title}</p>
          <p className="truncate text-[0.8125rem] leading-snug text-muted">{body}</p>
        </div>
      </div>
    </div>
  );
}
