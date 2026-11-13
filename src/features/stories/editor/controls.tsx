"use client";

import { useRef } from "react";
import { STORY_COLORS } from "@/lib/stories/design";

/** The thin vertical size slider down the left edge (text size, brush
 * size). Drag anywhere along it; top is biggest. */
export function VerticalSlider({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = (value - min) / (max - min);

  function set(clientY: number) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const t = 1 - Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    onChange(min + t * (max - min));
  }

  return (
    <div
      ref={ref}
      role="slider"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
      tabIndex={0}
      onKeyDown={(e) => {
        const step = (max - min) / 20;
        if (e.key === "ArrowUp") onChange(Math.min(max, value + step));
        if (e.key === "ArrowDown") onChange(Math.max(min, value - step));
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        set(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.buttons || e.pointerType === "touch") set(e.clientY);
      }}
      className="relative h-56 w-9 touch-none"
    >
      {/* A wedge: narrow at the bottom, wide at the top, like the size it sets. */}
      <svg viewBox="0 0 12 100" preserveAspectRatio="none" className="absolute left-1/2 top-0 h-full w-3 -translate-x-1/2" aria-hidden>
        <path d="M0 0H12L7 100H5Z" fill="rgb(255 255 255 / 0.32)" />
      </svg>
      <span
        className="absolute left-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_rgb(0_0_0/0.4)]"
        style={{ top: `${(1 - pct) * 100}%` }}
      />
    </div>
  );
}

/** The row of color dots. */
export function ColorRow({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto px-4 py-1" role="radiogroup" aria-label="Color">
      {STORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onChange(c)}
          className={`pressable h-7 w-7 flex-shrink-0 rounded-full ring-2 transition-transform duration-150 ${value === c ? "scale-110 ring-white" : "ring-white/70"}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

/** A round glass button for the editor's top bar. */
export function ToolButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`pressable flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
        active ? "bg-white text-black" : "bg-black/35 text-white"
      }`}
    >
      {children}
    </button>
  );
}
