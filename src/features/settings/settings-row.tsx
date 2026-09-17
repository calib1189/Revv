import Link from "next/link";
import type { SVGProps } from "react";
import { ChevronRightIcon } from "@/components/ui/icons";

/** One row of the settings list. Settings was a stack of unlabeled
 * text rows — no icon to scan by, and nothing to say a row was even
 * tappable. An icon rail makes the list scannable without reading every
 * label, and the chevron is what tells you the row goes somewhere. */
export function SettingsRow({
  href,
  icon: Icon,
  label,
  description,
  tone = "default",
}: {
  href: string;
  icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
  label: string;
  description: string;
  /** "accent" marks a row that isn't part of everyone's account — the
   * admin entry, which only ever renders for staff. */
  tone?: "default" | "accent";
}) {
  const isAccent = tone === "accent";

  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.04]"
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
          isAccent ? "bg-accent/15 text-accent" : "bg-white/[0.06] text-muted"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${isAccent ? "text-accent" : ""}`}>
          {label}
        </span>
        {/* Wraps rather than truncating: at 375px the icon rail and
            chevron leave ~230px, which cut every one of these mid-word
            ("…and messa…"). A settings row that's two lines tall costs
            nothing; a description you can't read does. */}
        <span className={`mt-0.5 block text-xs leading-snug ${isAccent ? "text-accent/70" : "text-muted"}`}>
          {description}
        </span>
      </span>
      <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/50 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** A labeled group of rows. Two unlabeled blocks gave the page no
 * structure to navigate by; naming each group does. */
export function SettingsGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <h2 className="micro-label mb-2.5 px-1 text-muted">{label}</h2>
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {children}
      </div>
    </section>
  );
}
