"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setUserVerifiedAction, setUserFounderAction } from "@/features/admin/actions";
import { BanUserButton } from "@/features/admin/ban-user-button";
import { VerifiedBadge } from "@/components/ui/verified-badge";

export interface UserRowData {
  userId: string;
  username: string;
  isVerified: boolean;
  isFounder: boolean;
  isBanned: boolean;
}

export function UserRow({ data }: { data: UserRowData }) {
  const [isPending, startTransition] = useTransition();
  const [isVerified, setIsVerified] = useState(data.isVerified);
  const [isFounder, setIsFounder] = useState(data.isFounder);
  const [confirmingFounder, setConfirmingFounder] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  return (
    <li className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/u/${data.username}`}
          className="flex items-center gap-1.5 text-sm font-medium hover:underline"
        >
          @{data.username}
          {isVerified && <VerifiedBadge className="h-4 w-4" />}
        </Link>
        <p className="text-xs text-muted">
          {isFounder && "Founder & Owner"}
          {isFounder && data.isBanned && " · "}
          {data.isBanned && "Banned"}
          {!isFounder && !data.isBanned && "No badges"}
        </p>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setVerifyError(null);
              try {
                await setUserVerifiedAction(data.userId, !isVerified);
                setIsVerified(!isVerified);
              } catch {
                setVerifyError("Didn't save. Try again.");
              }
            })
          }
          className="text-sm text-muted hover:text-foreground disabled:opacity-60"
        >
          {isVerified ? "Remove verified" : "Grant verified"}
        </button>
        {verifyError && <span className="text-sm text-danger">{verifyError}</span>}

        {confirmingFounder ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-danger">
              {isFounder ? "Remove Founder & Owner?" : "Grant Founder & Owner?"}
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await setUserFounderAction(data.userId, !isFounder);
                  setIsFounder(!isFounder);
                  setConfirmingFounder(false);
                })
              }
              className="font-medium text-danger underline underline-offset-2 disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirmingFounder(false)}
              className="text-muted underline underline-offset-2"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingFounder(true)}
            className="text-sm text-muted hover:text-foreground"
          >
            {isFounder ? "Remove founder" : "Grant founder"}
          </button>
        )}

        {!data.isBanned && <BanUserButton userId={data.userId} />}
      </div>
    </li>
  );
}
