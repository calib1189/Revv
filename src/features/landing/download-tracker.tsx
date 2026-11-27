"use client";

import { useEffect } from "react";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-store";

/** Records the download page's funnel (api/events/download): that someone
 * landed here, and which store badge they tapped, with where they came
 * from (TikTok's in-app browser, a TikTok ad click, a referrer). No
 * names or accounts: a random id per visit so a reload isn't counted
 * twice. Renders nothing. */
export function DownloadTracker({ platform, inApp }: { platform: string; inApp: string | null }) {
  useEffect(() => {
    let visit = "";
    try {
      visit = sessionStorage.getItem("sorza-dl-visit") ?? "";
      if (!visit) {
        visit = crypto.randomUUID();
        sessionStorage.setItem("sorza-dl-visit", visit);
      }
    } catch {
      visit = crypto.randomUUID();
    }

    const params = new URLSearchParams(window.location.search);
    let referrer = "";
    try {
      referrer = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      referrer = "";
    }
    const base = {
      visit,
      platform,
      in_app: inApp ?? "",
      source: params.get("utm_source") ?? params.get("ref") ?? "",
      referrer,
      // TikTok adds ttclid to every click from one of its ads.
      tiktok_ad: params.has("ttclid"),
    };

    const send = (name: string, props: Record<string, unknown>) => {
      const body = JSON.stringify({ name, props });
      // sendBeacon survives the page being swapped for the App Store.
      if (!navigator.sendBeacon?.("/api/events/download", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/events/download", { method: "POST", body, keepalive: true }).catch(() => undefined);
      }
    };

    send("download_page_view", base);

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href") ?? "";
      const store = href === APP_STORE_URL ? "app_store" : href === PLAY_STORE_URL ? "google_play" : null;
      if (store) send("download_store_tap", { ...base, store });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [platform, inApp]);

  return null;
}
