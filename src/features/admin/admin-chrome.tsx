"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SECTION_GROUPS, ADMIN_SECTIONS } from "@/features/admin/admin-sections";
import { BackIcon, HomeIcon } from "@/components/ui/icons";
import type { AdminQueueCounts } from "@/lib/admin/queue-counts";

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CountPill({ count, active }: { count: number; active?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={`numeral flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.6875rem] font-semibold ${
        active ? "bg-white/25 text-white" : "bg-danger text-white"
      }`}
    >
      {count}
    </span>
  );
}

/** The admin area's navigation, replacing the old row of eleven pills.
 * On a phone, the dashboard (/admin) is the menu, and every other page
 * gets a back bar to it that names where you are. From lg up, the same
 * grouped list stays beside every page, with what's waiting in each
 * review queue. Reads the current page from the URL (usePathname), so a
 * new section only has to be added to admin-sections.ts. */
export function AdminChrome({ counts, children }: { counts: AdminQueueCounts; children: React.ReactNode }) {
  const pathname = usePathname();
  const onDashboard = pathname === "/admin";
  const current = ADMIN_SECTIONS.find((section) => isCurrent(pathname, section.href));

  return (
    <div className="flex flex-1">
      <aside className="sticky top-0 hidden max-h-[100dvh] w-64 flex-shrink-0 overflow-y-auto border-r border-border px-3 pb-10 pt-8 lg:block">
        <Link
          href="/admin"
          className={`mb-5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.9375rem] font-semibold ${
            onDashboard ? "bg-foreground/[0.08]" : "hover:bg-foreground/[0.05]"
          }`}
        >
          <HomeIcon className="h-[18px] w-[18px]" />
          Dashboard
          <span className="ml-auto">
            <CountPill count={counts.total} />
          </span>
        </Link>
        {ADMIN_SECTION_GROUPS.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
              {group.title}
            </p>
            {group.sections.map(({ href, label, icon: Icon, color, countKey }) => {
              const active = isCurrent(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.875rem] transition-colors ${
                    active ? "bg-accent font-semibold text-accent-foreground" : "hover:bg-foreground/[0.05]"
                  }`}
                >
                  <span
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[7px] text-white [&>svg]:h-3.5 [&>svg]:w-3.5"
                    style={{ background: color }}
                  >
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {countKey && <CountPill count={counts[countKey]} active={active} />}
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {!onDashboard && (
          <div className="flex items-center gap-2 px-4 pt-5 sm:px-6 lg:hidden">
            <Link
              href="/admin"
              className="pressable flex items-center gap-1 rounded-full py-1 pr-2 text-[0.9375rem] font-medium text-accent"
            >
              <BackIcon className="h-[18px] w-[18px]" />
              Admin
            </Link>
            {current?.countKey && counts[current.countKey] > 0 && (
              <span className="text-[0.8125rem] text-muted">· {counts[current.countKey]} waiting</span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
