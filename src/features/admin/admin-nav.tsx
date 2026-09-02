"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface AdminNavCounts {
  reports: number;
  verifications: number;
  ads: number;
  meetups: number;
}

const LINKS: { href: string; label: string; countKey?: keyof AdminNavCounts }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/reports", label: "Reports", countKey: "reports" },
  { href: "/admin/verifications", label: "Verifications", countKey: "verifications" },
  { href: "/admin/ads", label: "Ads", countKey: "ads" },
  { href: "/admin/meetups", label: "Meetups", countKey: "meetups" },
  { href: "/admin/active", label: "Active" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/parts", label: "Parts" },
  { href: "/admin/users", label: "Users" },
];

/** Reads the active tab from the URL itself (usePathname) rather than
 * every page passing its own path down — one less thing for a page to
 * get wrong, and it means adding a new admin section never requires
 * touching every existing page. */
export function AdminNav({ counts }: { counts: AdminNavCounts }) {
  const pathname = usePathname();

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 pt-4 sm:px-6">
      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        const count = link.countKey ? counts[link.countKey] : 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              isActive ? "bg-accent text-accent-foreground" : "glass text-muted hover:text-foreground"
            }`}
          >
            {link.label}
            {count > 0 && (
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-semibold ${
                  isActive ? "bg-black/20 text-accent-foreground" : "bg-danger text-white"
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
