import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";

/** Section title above a group — the large, left-aligned heading iOS
 * uses between grouped lists. `action` sits on the right (a "See all"
 * link, a count). */
export function SectionTitle({
  children,
  action,
  className = "",
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-2.5 flex items-baseline justify-between gap-3 px-1 ${className}`}>
      <h2 className="text-[1.375rem] font-bold tracking-[-0.02em]">{children}</h2>
      {action && <div className="flex-shrink-0 text-[0.8125rem] font-medium text-muted">{action}</div>}
    </div>
  );
}

/** An inset grouped list — one rounded card, rows separated by hairlines
 * that start where the row's text does (see GroupedRow's `inset`). */
export function GroupedList({
  children,
  className = "",
  footer,
}: {
  children: ReactNode;
  className?: string;
  /** Small explanatory text under the group, like an iOS footer. */
  footer?: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>*+*]:before:absolute [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-[''] [&>*+*]:before:left-[var(--row-inset,1rem)]">
        {children}
      </div>
      {footer && <p className="mt-2 px-4 text-[0.8125rem] leading-snug text-muted">{footer}</p>}
    </div>
  );
}

/** A tinted rounded-square icon, the way Settings marks each row. */
export function RowIcon({ children, color = "var(--accent)" }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[8px] text-white [&>svg]:h-[17px] [&>svg]:w-[17px]"
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

/** A GroupedList row that performs an action rather than navigating —
 * for use from client components (upload, delete, toggle). */
export function GroupedButtonRow({
  label,
  detail,
  icon,
  onClick,
  disabled = false,
  destructive = false,
  trailing,
}: {
  label: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative flex min-h-[48px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-foreground/[0.06] disabled:opacity-60"
      style={{ "--row-inset": icon ? "3.625rem" : "1rem" } as CSSProperties}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[0.9375rem] ${destructive ? "text-danger" : ""}`}>{label}</p>
        {detail && <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{detail}</p>}
      </div>
      {trailing}
    </button>
  );
}

/** One row of a GroupedList. Renders as a Link when `href` is set (with
 * a chevron), otherwise a plain row. */
export function GroupedRow({
  label,
  detail,
  value,
  icon,
  href,
  trailing,
  destructive = false,
}: {
  label: ReactNode;
  /** Secondary line under the label. */
  detail?: ReactNode;
  /** Right-aligned value, muted. */
  value?: ReactNode;
  icon?: ReactNode;
  href?: string;
  /** Custom right-side content (replaces value + chevron). */
  trailing?: ReactNode;
  destructive?: boolean;
}) {
  const inner = (
    <>
      {icon}
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[0.9375rem] ${destructive ? "text-danger" : ""}`}>{label}</p>
        {detail && <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{detail}</p>}
      </div>
      {trailing ?? (
        <>
          {value != null && (
            <span className="max-w-[55%] flex-shrink-0 truncate text-right text-[0.9375rem] text-muted">
              {value}
            </span>
          )}
          {href && <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />}
        </>
      )}
    </>
  );

  const className =
    "relative flex min-h-[48px] items-center gap-3 px-4 py-2.5";
  // Hairline starts after the icon when there is one (16px pad + 30px
  // icon + 12px gap), at the text edge otherwise.
  const style = { "--row-inset": icon ? "3.625rem" : "1rem" } as CSSProperties;

  return href ? (
    <Link href={href} className={`${className} transition-colors active:bg-foreground/[0.06]`} style={style}>
      {inner}
    </Link>
  ) : (
    <div className={className} style={style}>
      {inner}
    </div>
  );
}
