import Link from "next/link";
import type { ReactNode } from "react";
import { BackIcon } from "@/components/ui/icons";

/** The large-title header every page opens with: an optional iOS-style
 * back link (chevron + parent name, in the accent colour), an optional
 * eyebrow, the title set large, an optional line of description, and an
 * optional trailing action aligned to the title's baseline. */
export function PageHeader({
  title,
  eyebrow,
  description,
  back,
  action,
  className = "mb-6",
}: {
  /** Omit for a back-link-only header (the page sets its own title). */
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={className}>
      {back && (
        <Link
          href={back.href}
          className="-ml-1.5 mb-2 inline-flex items-center gap-0.5 rounded-full py-1 pl-0.5 pr-2 text-[0.9375rem] font-medium text-accent"
        >
          <BackIcon className="h-5 w-5" />
          {back.label}
        </Link>
      )}
      {(title || eyebrow || action) && (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <p className="text-[0.8125rem] font-medium text-muted">{eyebrow}</p>}
            {title && (
              <h1 className="text-balance text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
                {title}
              </h1>
            )}
          </div>
          {action && <div className="mb-1 flex-shrink-0">{action}</div>}
        </div>
      )}
      {description && (
        <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-muted">{description}</p>
      )}
    </header>
  );
}

/** The standard page column: centred, phone gutters, large-title top
 * padding, room at the bottom for the tab bar. */
export function PageShell({
  children,
  width = "lg",
}: {
  children: ReactNode;
  width?: "lg" | "2xl" | "3xl" | "5xl";
}) {
  const max = { lg: "max-w-lg", "2xl": "max-w-2xl", "3xl": "max-w-3xl", "5xl": "max-w-5xl" }[width];
  return <div className={`mx-auto w-full ${max} flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12`}>{children}</div>;
}
