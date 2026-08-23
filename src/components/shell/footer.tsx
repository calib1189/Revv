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
    </footer>
  );
}
