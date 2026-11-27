"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Turns on instant open (public/sw.js): the service worker keeps a copy
 * of the main tabs and shows it the moment the app opens, then tells this
 * page what to do once the fresh one is in: refresh the content in place,
 * or reload (someone else signed in, or a new deploy). Signed out, it
 * clears any saved copy. Locally it only runs when asked to
 * (localStorage "sorza-sw" = "1"), so development pages aren't saved. */
export function InstantOpen({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let enabled = process.env.NODE_ENV === "production";
    try {
      if (localStorage.getItem("sorza-sw") === "1") enabled = true;
    } catch {
      // No storage: production default stands.
    }
    if (!enabled) return;

    const sw = navigator.serviceWorker;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; action?: string } | null;
      if (data?.type !== "sorza-cache") return;
      if (data.action === "reload") window.location.reload();
      else if (data.action === "refresh") router.refresh();
    };
    sw.addEventListener("message", onMessage);

    sw.register("/sw.js").catch(() => undefined);
    const controller = sw.controller;
    if (controller) {
      controller.postMessage(
        signedIn ? { type: "sorza-check", path: window.location.pathname } : { type: "sorza-purge" },
      );
    }
    return () => sw.removeEventListener("message", onMessage);
  }, [router, signedIn]);

  return null;
}
