"use client";

import type { GarageTheme } from "@/lib/db/profiles";

const OPTIONS: { value: GarageTheme; label: string }[] = [
  { value: "workshop", label: "Workshop" },
  { value: "showroom", label: "Showroom" },
  { value: "midnight", label: "Midnight" },
];

export function GarageThemePicker({
  theme,
  onSelect,
  isPending,
}: {
  theme: GarageTheme;
  onSelect: (next: GarageTheme) => void;
  isPending: boolean;
}) {
  return (
    <div className="glass flex items-center gap-1.5 rounded-full p-1.5">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          disabled={isPending}
          aria-pressed={theme === value}
          title={label}
          className={`garage-swatch garage-swatch-${value} ${
            theme === value ? "garage-swatch-active" : ""
          }`}
        >
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
