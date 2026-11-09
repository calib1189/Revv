"use client";

import { useSyncExternalStore } from "react";
import { formatClock, formatTimeLeft } from "@/lib/daily/format";

function subscribeSeconds(callback: () => void): () => void {
  const id = window.setInterval(callback, 1000);
  return () => window.clearInterval(id);
}

/** Live time left until a deadline. Renders the plain fallback on the
 * server and the ticking value once in the browser, so the server's
 * clock never has to agree with the viewer's to the second. */
export function Countdown({
  endsAt,
  fallback = "Ends at midnight CT",
  closedLabel = "Closed",
  className = "",
  clock = false,
}: {
  endsAt: string;
  fallback?: string;
  closedLabel?: string;
  className?: string;
  /** "23:41:07" instead of "23h 41m". */
  clock?: boolean;
}) {
  const end = new Date(endsAt).getTime();
  const format = clock ? formatClock : formatTimeLeft;
  const left = useSyncExternalStore(
    subscribeSeconds,
    () => format(end - Date.now()) ?? closedLabel,
    () => fallback,
  );
  return <span className={`numeral ${className}`}>{left}</span>;
}
