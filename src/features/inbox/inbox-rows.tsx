import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/features/feed/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { relativeTime } from "@/lib/format/relative-time";

/** The inbox's rows (app/messages/page.tsx). */

export function Chip({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`pressable flex h-9 flex-shrink-0 items-center gap-1.5 rounded-xl px-4 text-[0.9375rem] font-semibold transition-colors ${
        active ? "bg-accent/15 text-accent" : "bg-foreground/[0.07] text-foreground"
      }`}
    >
      {label}
      {count > 0 && <span className="numeral">{count}</span>}
    </Link>
  );
}

export function PinnedRow({
  href,
  icon,
  iconClass,
  title,
  line,
  unread,
  at,
}: {
  href: string;
  icon: ReactNode;
  iconClass: string;
  title: string;
  line: string;
  unread: number;
  at: string | null;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3.5 px-4 py-3 transition-colors active:bg-foreground/[0.06]">
        <span className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${iconClass}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[1rem] font-semibold">{title}</p>
          <p className={`mt-0.5 truncate text-[0.875rem] ${unread > 0 ? "font-semibold text-foreground" : "text-muted"}`} suppressHydrationWarning>
            {line}
            {at && <span className="font-normal text-muted"> · {relativeTime(at)}</span>}
          </p>
        </div>
        {unread > 0 && (
          <span className="flex h-6 min-w-6 flex-shrink-0 items-center justify-center rounded-full bg-danger px-1.5 text-[0.75rem] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
    </li>
  );
}

export function ConversationRow({
  href,
  username,
  name,
  verified,
  avatarUrl,
  status,
  at,
}: {
  href: string;
  username: string;
  name: string;
  verified: boolean;
  avatarUrl: string | null;
  status: { text: string; unread: boolean };
  at: string | null;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3.5 px-4 py-3 transition-colors active:bg-foreground/[0.06]">
        <Avatar username={username} avatarUrl={avatarUrl} className="h-14 w-14 flex-shrink-0 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[1rem] font-semibold">
            <span className="truncate">{name}</span>
            {verified && <VerifiedBadge className="h-4 w-4 flex-shrink-0" />}
          </p>
          <p className={`mt-0.5 truncate text-[0.875rem] ${status.unread ? "font-semibold text-foreground" : "text-muted"}`} suppressHydrationWarning>
            {status.text}
            {at && <span className="font-normal text-muted"> · {relativeTime(at)}</span>}
          </p>
        </div>
        {status.unread && <span aria-label="Unread" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent" />}
      </Link>
    </li>
  );
}
