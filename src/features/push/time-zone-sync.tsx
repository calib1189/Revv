"use client";

import { useEffect } from "react";
import { saveTimeZoneAction } from "@/features/push/push-actions";

const STORAGE_KEY = "sorza-time-zone";

/** Saves the device's time zone for notification timing, once, and again
 * only if it changes (travel). Renders nothing. */
export function TimeZoneSync() {
  useEffect(() => {
    let zone: string;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === zone) return;
    } catch {
      // Storage unavailable: just save it.
    }
    saveTimeZoneAction(zone).then(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, zone);
      } catch {
        // ignore
      }
    });
  }, []);
  return null;
}
