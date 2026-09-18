"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon, DeviceIcon, CheckIcon } from "@/components/ui/icons";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: DeviceIcon },
];

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("sorza-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("sorza-theme") as Theme | null;
    if (stored) {
      Promise.resolve().then(() => setTheme(stored));
    }
  }, []);

  function handleSelect(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  // Display > Appearance style: three tappable previews in one card,
  // each a tiny mock screen in its own palette, with a check under the
  // chosen one.
  return (
    <div className="glass-raised elev-1 grid grid-cols-3 gap-2 rounded-[22px] p-4">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => handleSelect(value)}
            aria-pressed={selected}
            className="pressable flex flex-col items-center gap-2"
          >
            <span
              className={`relative flex h-[76px] w-[52px] overflow-hidden rounded-[10px] ring-2 transition-shadow ${
                selected ? "ring-accent" : "ring-border"
              }`}
            >
              {value === "system" ? (
                <>
                  <span className="h-full w-1/2 bg-[#f4f4f5]" />
                  <span className="h-full w-1/2 bg-[#141416]" />
                </>
              ) : (
                <span className={`h-full w-full ${value === "light" ? "bg-[#f4f4f5]" : "bg-[#141416]"}`} />
              )}
              <span className="absolute inset-x-2 top-2 flex flex-col gap-1">
                <span className="h-1.5 w-3/4 rounded-full bg-[#8e8e93]/60" />
                <span className="h-1.5 w-1/2 rounded-full bg-[#8e8e93]/40" />
              </span>
              <Icon className="absolute bottom-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 text-[#8e8e93]" />
            </span>
            <span className="text-[0.8125rem] font-medium">{label}</span>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                selected ? "bg-accent text-accent-foreground" : "ring-1 ring-border"
              }`}
            >
              {selected && <CheckIcon className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
