"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { INVITE_TIERS } from "@/lib/invites/tiers";
import { REFERRAL_POINTS } from "@/lib/invites/rewards";
import { InviteBadge, inviteBadgeRung } from "@/features/invites/invite-badge";
import { isAnnouncementBlockedPath } from "@/lib/announcements";
import { markInvitePromoSeenAction } from "@/features/invites/actions";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/** The one-time invite program announcement (points per friend, 0125),
 * shown the next time a member opens the app. It's marked seen as soon as it shows,
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
    <Sheet open={open} onClose={() => setOpen(false)} title="Invite friends, earn points">
      <div className="text-center">
        <p className="numeral text-[3.5rem] font-bold leading-none tracking-[-0.04em] text-accent">+{REFERRAL_POINTS}</p>
        <h3 className="mt-2 text-balance text-[1.5rem] font-bold leading-tight tracking-[-0.025em]">
          points for every friend you bring to SORZA
        </h3>
        <p className="mt-2 text-[0.9375rem] leading-snug text-muted">
          They get {REFERRAL_POINTS} too, once they add their car. {REFERRAL_POINTS} points is a free instant re-rate.
        </p>
      </div>

      {/* What inviting adds up to: points at each step, and the badge
          that comes with the bigger ones. */}
      <ul className="mt-5 overflow-hidden rounded-[20px] glass-inset">
        {[{ count: 1, achievementId: null as string | null, name: null as string | null }, ...INVITE_TIERS].map((tier, i) => {
          const rung = tier.achievementId ? inviteBadgeRung(tier.achievementId) : null;
          return (
            <li
              key={tier.count}
              className="animate-section-rise relative flex items-center gap-3 px-4 py-2.5"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              {i > 0 && <span className="absolute left-4 right-4 top-0 h-px bg-border" />}
              <span className="w-[5.5rem] flex-shrink-0 text-[0.875rem] font-semibold">
                {tier.count} {tier.count === 1 ? "friend" : "friends"}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-muted"><span className="hidden sm:inline">{tier.name ?? ""}</span></span>
              {rung && <InviteBadge rung={rung} className="h-8 w-8 flex-shrink-0" compact />}
              <span className="numeral w-[5.25rem] flex-shrink-0 text-right text-[1rem] font-bold text-accent">
                +{(tier.count * REFERRAL_POINTS).toLocaleString("en-US")}
              </span>
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
