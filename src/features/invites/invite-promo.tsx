"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { INVITE_TIERS } from "@/lib/invites/tiers";
import { InviteBadge, inviteBadgeRung } from "@/features/invites/invite-badge";
import { isAnnouncementBlockedPath } from "@/lib/announcements";
import { markInvitePromoSeenAction } from "@/features/invites/actions";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/** The one-time invite program announcement, shown the next time an
 * existing member opens the app. It's marked seen as soon as it shows,
 * so closing the app instead of tapping a button doesn't bring it back. */
export function InvitePromo() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || isAnnouncementBlockedPath(pathname)) return;
    // A beat after the app paints, so it reads as an announcement rather
    // than part of the page loading. Flagged inside the timer, so an
    // effect that's cleaned up and re-run still shows it once.
    const t = setTimeout(() => {
      shown.current = true;
      setOpen(true);
      void markInvitePromoSeenAction();
    }, 900);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="New on SORZA">
      <div className="text-center">
        <h3 className="text-balance text-[1.625rem] font-bold leading-tight tracking-[-0.025em]">
          Invite your friends. Build your reputation.
        </h3>
        <p className="mt-2 text-[0.9375rem] leading-snug text-muted">
          Every friend who joins with your link and adds their car gets you closer to the next badge.
        </p>
      </div>

      {/* The four badges up close, lowest to highest. */}
      <ul className="mt-5 grid grid-cols-2 gap-2.5">
        {INVITE_TIERS.map((tier, i) => {
          const rung = inviteBadgeRung(tier.achievementId);
          return (
            <li
              key={tier.count}
              className="glass-inset animate-section-rise flex flex-col items-center rounded-[20px] px-2.5 pb-3.5 pt-3 text-center"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              {rung && <InviteBadge rung={rung} className="h-[5.5rem] w-[5.5rem]" shine shineDelay={0.6 + i * 0.35} />}
              <span className="mt-1.5 text-[0.9375rem] font-bold leading-tight tracking-[-0.01em]">{tier.name}</span>
              <span className="mt-1 text-[0.75rem] leading-snug text-muted">{tier.reward}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-col gap-2">
        <Link href="/invite" onClick={() => setOpen(false)}>
          <Button className="h-12 w-full text-[1rem] font-semibold">Get my invite link</Button>
        </Link>
        <Button variant="ghost" onClick={() => setOpen(false)} className="h-11 w-full text-[0.9375rem] text-muted">
          Not now
        </Button>
      </div>
    </Sheet>
  );
}
