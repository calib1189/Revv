"use client";

import { useSyncExternalStore } from "react";
import { DAY_KEYS, DAY_LABELS, dayKeyFor, formatDayHours, type BusinessHours, type DayKey } from "@/lib/shops/hours";

// The day doesn't need live updates while the page is open.
function subscribeNever(): () => void {
  return () => {};
}

/** The owner's weekly hours, with today in bold. "Today" is worked out in
 * the viewer's browser after load, since the server's clock may sit in a
 * different time zone than the person reading. */
export function ShopHours({ hours }: { hours: BusinessHours }) {
  const today = useSyncExternalStore<DayKey | null>(
    subscribeNever,
    () => dayKeyFor(new Date()),
    () => null,
  );

  return (
    <ul className="glass-raised elev-1 flex flex-col overflow-hidden rounded-[20px]">
      {DAY_KEYS.map((day) => {
        const isToday = day === today;
        return (
          <li
            key={day}
            className={`flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 text-[0.9375rem] last:border-b-0 ${
              isToday ? "font-semibold text-foreground" : "text-muted"
            }`}
          >
            <span className="flex items-center gap-2">
              {DAY_LABELS[day]}
              {isToday && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-accent">
                  Today
                </span>
              )}
            </span>
            <span className="numeral">{formatDayHours(hours[day])}</span>
          </li>
        );
      })}
    </ul>
  );
}
