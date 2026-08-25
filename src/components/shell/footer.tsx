import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-6 text-center text-xs text-muted">
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/legal/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link href="/legal/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/legal/guidelines" className="hover:text-foreground">
          Community guidelines
        </Link>
        <span>© {new Date().getFullYear()} REVV</span>
      </nav>
      {/* Required disclosure, not decoration — REVV earns a commission on
          qualifying purchases through the Amazon links on modification
          and marketplace pages. Site-wide here as the baseline, with a
          second, more prominent mention directly on /parts where those
          links are actually concentrated (see its page copy). */}
      <p className="mt-3 text-[11px] text-muted/70">
        As an Amazon Associate, REVV earns from qualifying purchases.
      </p>
    </footer>
  );
}
