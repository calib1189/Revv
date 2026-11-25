"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellIcon } from "@/components/ui/icons";
import { enableNativePush, getNativePushPermission, isNativeApp, type NativePushPermission } from "@/lib/native/push";

/** A quiet row in the streak card, inside the app only, while
 * notifications are off: the streak's own reason to turn them on. Never
 * asked: the button asks iOS. Said no before: iOS won't ask again, so it
 * opens Notifications settings, which explains the Settings app route.
 * Turned on, or on the web, it isn't there at all. */
export function PushNudge() {
  const [permission, setPermission] = useState<NativePushPermission | "unknown">("unknown");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!(await isNativeApp())) return;
        const p = await getNativePushPermission();
        if (!cancelled) setPermission(p);
      } catch {
        // No nudge rather than a broken one.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (permission === "unknown" || permission === "granted") return null;

  const row = "flex items-center gap-3 rounded-[16px] bg-foreground/[0.05] px-3.5 py-3";
  const text = (
    <>
      <BellIcon className="h-5 w-5 flex-shrink-0 text-accent" />
      <span className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
        <span className="block font-semibold">Get a heads-up before your streak ends</span>
        <span className="block text-muted">Turn on notifications</span>
      </span>
    </>
  );

  if (permission === "denied") {
    return (
      <Link href="/settings/notifications" className={`pressable ${row}`}>
        {text}
        <span className="flex-shrink-0 rounded-full bg-accent px-3 py-1.5 text-[0.75rem] font-semibold text-white">Turn on</span>
      </Link>
    );
  }
  return (
    <div className={row}>
      {text}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void enableNativePush()
            .then((result) => setPermission(result.ok ? "granted" : result.reason === "denied" ? "denied" : "prompt"))
            .finally(() => setBusy(false));
        }}
        className="pressable flex-shrink-0 rounded-full bg-accent px-3 py-1.5 text-[0.75rem] font-semibold text-white disabled:opacity-60"
      >
        {busy ? "…" : "Turn on"}
      </button>
    </div>
  );
}
