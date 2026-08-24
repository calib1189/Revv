"use client";

import { useState, useTransition, type ReactNode } from "react";
import { setGarageThemeAction } from "@/features/garage/garage-theme-actions";
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

export function GarageScene({
  initialTheme,
  children,
}: {
  initialTheme: GarageTheme;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState(initialTheme);
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: GarageTheme) {
    if (next === theme) return;
    const previous = theme;
    setTheme(next);
    startTransition(async () => {
      const { error } = await setGarageThemeAction(next);
      if (error) setTheme(previous);
    });
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-end gap-2">
        <span className="text-xs text-muted">Garage theme</span>
        <GarageThemePicker theme={theme} onSelect={handleSelect} isPending={isPending} />
      </div>
      <div data-garage-theme={theme} className="garage-scene">
        {children}
      </div>
    </>
  );
}
