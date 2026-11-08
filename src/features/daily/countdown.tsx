"use client";

import { useSyncExternalStore } from "react";
import { formatTimeLeft } from "@/lib/daily/format";

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
}: {
  endsAt: string;
  fallback?: string;
  closedLabel?: string;
  className?: string;
}) {
  const end = new Date(endsAt).getTime();
  const left = useSyncExternalStore(
    subscribeSeconds,
    () => formatTimeLeft(end - Date.now()) ?? closedLabel,
    () => fallback,
  );
  return <span className={`numeral ${className}`}>{left}</span>;
}
