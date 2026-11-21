import type { PushPayload } from "@/lib/push/payload";
import { teeDropEndLabel, type TeeDesign } from "@/lib/merch/products";

const pad = (n: number) => String(n).padStart(2, "0");

/** Time left on a limited drop: "2d 14h 03m 12s" while a day or more is
 * left, then a "14:03:09" clock on the last day. Never negative. */
export function formatDropCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** The one push everyone gets when a drop goes live. */
export function dropPushPayload(drop: TeeDesign): PushPayload {
  const title = `${drop.name} Tee`;
  const end = teeDropEndLabel(drop);
  return {
    title,
    body: `The ${title} just dropped.${end ? ` It's gone after ${end}, so grab yours.` : ""}`,
    url: `/store?tee=${drop.id}`,
  };
}

/** The daily_push_log day a drop's push is logged under. One fixed key per
 * drop, so the log's primary key allows one push per person per drop. */
export function dropLogDay(drop: TeeDesign): string {
  return (drop.endsAt ?? "").slice(0, 10);
}
