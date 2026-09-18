import Link from "next/link";

/** The same look as SegmentedControl, for when each segment is a URL
 * (a server-rendered filter) rather than local state. No sliding thumb —
 * a navigation re-renders the page anyway — just the lifted active
 * segment on the tinted track. */
export function SegmentedLinks({
  options,
  className = "",
}: {
  options: { href: string; label: string; active: boolean }[];
  className?: string;
}) {
  return (
    <nav
      className={`flex rounded-[12px] p-[3px] ${className}`}
      style={{ background: "var(--segment-track)" }}
    >
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          aria-current={o.active ? "page" : undefined}
          scroll={false}
          className={`min-w-0 flex-1 truncate rounded-[9px] px-1 py-[7px] text-center text-[0.8125rem] transition-colors duration-200 ${
            o.active
              ? "font-semibold text-foreground shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)]"
              : "font-medium text-foreground/70"
          }`}
          style={o.active ? { background: "var(--segment-thumb)" } : undefined}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/** A horizontally scrolling row of filter chips — the selected one is
 * solid foreground, the rest sit on the segment track colour. */
export function FilterChips({
  options,
  className = "",
}: {
  options: { href: string; label: string; active: boolean }[];
  className?: string;
}) {
  return (
    <div className={`no-scrollbar fade-edge-r -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 ${className}`}>
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          scroll={false}
          aria-current={o.active ? "page" : undefined}
          className={`pressable flex-shrink-0 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
            o.active ? "bg-foreground text-background" : "text-foreground/80"
          }`}
          style={o.active ? undefined : { background: "var(--segment-track)" }}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
