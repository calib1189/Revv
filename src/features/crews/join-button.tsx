"use client";

import { useState, useTransition } from "react";
import { joinCrewAction, leaveCrewAction } from "@/features/crews/actions";
import { Button } from "@/components/ui/button";
import type { Crew } from "@/lib/db/crews";
import type { CrewMember } from "@/lib/db/crew-members";

type LocalStatus = "none" | "pending" | "approved";

/** Four visible states driven off the viewer's own membership row (or lack
 * of one): Join (public, not a member), Request to join (private, not a
 * member), Pending (private, request filed), Leave (approved member).
 * Optimistic like follow-button.tsx — flips immediately, reverts on
 * failure. The crew's owner never sees a button at all: there's no
 * ownership-transfer flow, so leaving isn't a real option for them. */
export function JoinButton({
  crewId,
  visibility,
  initialMembership,
  isOwner,
}: {
  crewId: string;
  visibility: Crew["visibility"];
  initialMembership: CrewMember | null;
  isOwner: boolean;
}) {
  const [status, setStatus] = useState<LocalStatus>(
    initialMembership?.status === "approved"
      ? "approved"
      : initialMembership?.status === "pending"
        ? "pending"
        : "none",
  );
  const [, startTransition] = useTransition();

  if (isOwner) {
    return <p className="text-sm text-muted">You lead this crew.</p>;
  }

  function handleClick() {
    const was = status;
    if (was === "none") {
      setStatus(visibility === "public" ? "approved" : "pending");
      startTransition(async () => {
        try {
          await joinCrewAction(crewId);
        } catch {
          setStatus(was);
        }
      });
    } else {
      setStatus("none");
      startTransition(async () => {
        try {
          await leaveCrewAction(crewId);
        } catch {
          setStatus(was);
        }
      });
    }
  }

  const label =
    status === "approved" ? "Leave" : status === "pending" ? "Pending" : visibility === "public" ? "Join" : "Request to join";

  return (
    <Button
      type="button"
      variant={status === "none" ? "primary" : "secondary"}
      className="px-4 py-1.5 text-sm"
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}
