"use client";

import { SOUND_GENRES, type SoundGenre } from "@/lib/sounds/genres";

/** "All" plus one chip per genre, in a row that scrolls sideways. `tone`
 * picks the fixed-dark look (the picker sheet, which only opens over the
 * camera or editor) or the themed look (Discover). */
export function SoundGenreChips({
  value,
  onChange,
  tone = "themed",
  className = "",
}: {
  value: SoundGenre | null;
  onChange: (genre: SoundGenre | null) => void;
  tone?: "dark" | "themed";
  className?: string;
}) {
  const options: { id: SoundGenre | null; label: string }[] = [{ id: null, label: "All" }, ...SOUND_GENRES];
  return (
    <div role="group" aria-label="Genre" className={`no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 ${className}`}>
      {options.map((o) => {
        const active = o.id === value;
        const look =
          tone === "dark"
            ? active
              ? "bg-white text-black"
              : "bg-white/[0.08] text-white/80"
            : active
              ? "bg-foreground text-background"
              : "text-foreground/80";
        return (
          <button
            key={o.id ?? "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={`pressable h-8 flex-shrink-0 whitespace-nowrap rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors duration-200 ${look}`}
            style={tone === "themed" && !active ? { background: "var(--segment-track)" } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
