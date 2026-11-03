"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setUserVerifiedAction } from "@/features/admin/actions";
import { VerifiedBadge } from "@/components/ui/verified-badge";

/** The same grant/revoke as Admin → Users, from the person's own profile
 * (its ⋯ menu), so verifying someone doesn't start with searching for
 * them. Only rendered for admins; setUserVerifiedAction and the
 * protect_is_verified_column trigger enforce that regardless. Asks
 * first either way — the badge is the one thing nobody can get on their
 * own, so a stray tap shouldn't hand it out or take it away. */
export function GrantVerifiedButton({
  userId,
  username,
  initialIsVerified,
}: {
  userId: string;
  username: string;
  initialIsVerified: boolean;
}) {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState(initialIsVerified);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply() {
    const next = !isVerified;
    setError(null);
    startTransition(async () => {
      try {
        await setUserVerifiedAction(userId, next);
        setIsVerified(next);
        setConfirming(false);
        // Brings the seal and the Verified chip in (or out) up top.
        router.refresh();
      } catch {
        setError("Couldn't change the verified badge. Try again.");
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        <p className="text-sm">
          {isVerified
            ? `Remove @${username}'s verified badge?`
            : `Give @${username} the verified badge?`}
        </p>
        <div className="flex items-center gap-4 text-sm">
          <button
            type="button"
            disabled={isPending}
            onClick={apply}
            className={`font-semibold disabled:opacity-60 ${isVerified ? "text-danger" : "text-verified"}`}
          >
            {isPending ? "Saving…" : isVerified ? "Remove badge" : "Give badge"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            className="text-muted disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-[0.8125rem] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
    >
      <VerifiedBadge className="h-4 w-4" label="" aria-hidden />
      {isVerified ? "Remove verified badge" : "Give verified badge"}
    </button>
  );
}
