"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { setUserVerifiedAction, setUserFounderAction } from "@/features/admin/actions";
import { BanUserButton } from "@/features/admin/ban-user-button";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Avatar } from "@/features/feed/avatar";

export interface UserRowData {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** When the account was made, already formatted ("Nov 3, 2026") — done
   * on the server so the server and browser renders can't disagree. */
  joinedLabel: string;
  isVerified: boolean;
  isFounder: boolean;
  isBanned: boolean;
  isAdmin: boolean;
}

function Tag({ children, tone }: { children: React.ReactNode; tone: "danger" | "accent" | "muted" }) {
  const toneClass =
    tone === "danger" ? "bg-danger/15 text-danger" : tone === "accent" ? "bg-accent/15 text-accent" : "bg-foreground/[0.08] text-muted";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${toneClass}`}>{children}</span>
  );
}

export function UserRow({ data }: { data: UserRowData }) {
  const [isPending, startTransition] = useTransition();
  const [isVerified, setIsVerified] = useState(data.isVerified);
  const [isFounder, setIsFounder] = useState(data.isFounder);
  const [confirmingFounder, setConfirmingFounder] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  return (
    <li className="flex flex-col gap-3 border-b border-border px-4 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/u/${data.username}`} className="flex min-w-0 items-center gap-3">
        <Avatar username={data.username} avatarUrl={data.avatarUrl} className="h-11 w-11 flex-shrink-0 text-base" />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-[0.9375rem] font-semibold">
            <span className="truncate">{data.displayName || `@${data.username}`}</span>
            {isVerified && <VerifiedBadge className="h-4 w-4 flex-shrink-0" />}
          </p>
          <p className="truncate text-[0.8125rem] text-muted">
            {data.displayName ? `@${data.username} · ` : ""}Joined {data.joinedLabel}
          </p>
          {(isFounder || data.isBanned || data.isAdmin) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {data.isAdmin && <Tag tone="accent">Admin</Tag>}
              {isFounder && <Tag tone="muted">Founder &amp; Owner</Tag>}
              {data.isBanned && <Tag tone="danger">Banned</Tag>}
            </div>
          )}
        </div>
      </Link>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-2 pl-14 sm:pl-0">
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

        {/* Not offered on admin accounts — that would include your own,
            and admin access is only ever granted through the database, so
            it's not something to undo with one tap here. */}
        {!data.isBanned && !data.isAdmin && <BanUserButton userId={data.userId} />}
      </div>
    </li>
  );
}
