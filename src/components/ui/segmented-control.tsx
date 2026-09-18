"use client";

/** An iOS segmented control: equal-width segments on a tinted track,
 * with a lifted thumb that slides to the active one. Equal widths mean
 * the thumb's position is pure arithmetic (index × segment width) — no
 * measuring, no layout effect, no flash before first measure. Colours
 * come from --segment-track / --segment-thumb (globals.css). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <div
      role="tablist"
      className={`relative flex rounded-[12px] p-[3px] ${className}`}
      style={{ background: "var(--segment-track)" }}
    >
      <div
        aria-hidden
        className="absolute bottom-[3px] top-[3px] rounded-[9px] shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] transition-transform duration-300 ease-[var(--ease-ios)]"
        style={{
          left: 3,
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
          background: "var(--segment-thumb)",
        }}
      />
      {options.map((o) => {
        const isActive = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(o.value)}
            className={`relative z-10 min-w-0 flex-1 truncate px-1 py-[7px] text-[0.8125rem] transition-colors duration-200 ${
              isActive ? "font-semibold text-foreground" : "font-medium text-foreground/70"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
