"use client";

import { useState, useTransition } from "react";
import { setQuietHoursAction } from "@/features/push/push-actions";
import { GroupedList, GroupedRow } from "@/components/ui/grouped-list";
import { Toggle } from "@/components/ui/toggle";

function hourLabel(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const selectClass =
  "glass-inset rounded-[10px] px-2.5 py-1.5 text-[0.9375rem] text-foreground focus:outline-none focus:ring-4 focus:ring-accent/15";

/** No Sorza Daily notifications between these hours, in your own time. */
export function QuietHoursSettings({
  initial,
}: {
  initial: { enabled: boolean; start: number; end: number; timeZone: string | null };
}) {
  const [quiet, setQuiet] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: typeof quiet) {
    const previous = quiet;
    setQuiet(next);
    setError(null);
    startTransition(async () => {
      const result = await setQuietHoursAction({ enabled: next.enabled, start: next.start, end: next.end });
      if (result.error) {
        setQuiet(previous);
        setError(result.error);
      }
    });
  }

  return (
    <GroupedList
      footer={
        error ? (
          <span className="text-danger">{error}</span>
        ) : (
          `Daily challenge, results and vote alerts wait until quiet hours end.${
            quiet.timeZone ? ` Times are in your time zone (${quiet.timeZone.replace(/_/g, " ")}).` : ""
          }`
        )
      }
    >
      <GroupedRow
        label="Quiet hours"
        trailing={
          <Toggle checked={quiet.enabled} onChange={(enabled) => save({ ...quiet, enabled })} disabled={pending} label="Quiet hours" />
        }
      />
      {quiet.enabled && (
        <GroupedRow
          label="From"
          trailing={
            <span className="flex items-center gap-2">
              <select
                aria-label="Quiet hours start"
                value={quiet.start}
                disabled={pending}
                onChange={(e) => save({ ...quiet, start: Number(e.target.value) })}
                className={selectClass}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
              <span className="text-[0.8125rem] text-muted">to</span>
              <select
                aria-label="Quiet hours end"
                value={quiet.end}
                disabled={pending}
                onChange={(e) => save({ ...quiet, end: Number(e.target.value) })}
                className={selectClass}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </span>
          }
        />
      )}
    </GroupedList>
  );
}
