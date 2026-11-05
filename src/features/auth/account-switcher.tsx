"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/features/feed/avatar";
import { addAccountAction, switchAccountAction } from "@/features/auth/account-actions";
import type { SwitchableAccount } from "@/features/auth/other-accounts";
import { readStoredPushToken } from "@/lib/native/push";
import { Spinner } from "@/components/ui/spinner";
import { CheckIcon, ChevronRightIcon, CloseIcon, PlusIcon } from "@/components/ui/icons";
import { GroupedList } from "@/components/ui/grouped-list";

/** Where to land after switching: the new account's profile when the
 * switch started on a profile, Settings when it started there. */
type Destination = "profile" | "settings";

function destinationFor(account: SwitchableAccount, destination: Destination): string {
  return destination === "profile" ? `/u/${encodeURIComponent(account.username)}` : "/settings";
}

function useAccountSwitching(destination: Destination) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(account: SwitchableAccount) {
    setError(null);
    setBusyId(account.id);
    try {
      const result = await switchAccountAction(account.id, readStoredPushToken() ?? undefined);
      if (result.error) {
        setError(result.error);
        setBusyId(null);
        // An ended session was removed from the list server-side.
        if (result.expired) router.refresh();
        return;
      }
      // A full load, not client navigation: every cached screen and the
      // browser's Supabase client still belong to the previous account.
      window.location.replace(destinationFor(account, destination));
    } catch {
      setError("Couldn't switch accounts. Check your connection and try again.");
      setBusyId(null);
    }
  }

  async function addAccount() {
    setError(null);
    setBusyId("add");
    try {
      const result = await addAccountAction();
      if (result.error) {
        setError(result.error);
        setBusyId(null);
        return;
      }
      // Full load on purpose, same reason as switchTo above.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login?add=1");
    } catch {
      setError("Couldn't open the login screen. Check your connection and try again.");
      setBusyId(null);
    }
  }

  return { busyId, error, switchTo, addAccount };
}

function AccountName({ account }: { account: SwitchableAccount }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[0.9375rem] font-semibold">{account.displayName || `@${account.username}`}</p>
      {account.displayName && <p className="truncate text-[0.8125rem] text-muted">@{account.username}</p>}
    </div>
  );
}

const ROW = "relative flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left";

/** The profile header's "@username ⌄" control, opening a sheet of every
 * account signed in on this device. */
export function AccountSwitcherButton({
  current,
  others,
  canAdd,
}: {
  current: SwitchableAccount;
  others: SwitchableAccount[];
  canAdd: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { busyId, error, switchTo, addAccount } = useAccountSwitching("profile");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyId) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busyId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Switch accounts"
        className="pressable glass-raised elev-1 flex h-10 max-w-[60vw] items-center gap-1.5 rounded-full pl-4 pr-3 text-[0.9375rem] font-semibold"
      >
        <span className="truncate">@{current.username}</span>
        <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 rotate-90 text-muted" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end">
          <button
            type="button"
            aria-label="Close"
            onClick={() => !busyId && setOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/60"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Switch accounts"
            className="animate-sheet-up relative mx-auto w-full max-w-lg overflow-hidden rounded-t-[28px] bg-surface pb-[max(1rem,env(safe-area-inset-bottom))] ring-1 ring-border"
          >
            <div className="px-4 pt-2.5">
              <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-foreground/20" />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[1.375rem] font-bold tracking-[-0.025em]">Accounts</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busyId !== null}
                  aria-label="Close"
                  className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-foreground/[0.08] text-muted disabled:opacity-50"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col">
              <div className={ROW} aria-current="true">
                <Avatar username={current.username} avatarUrl={current.avatarUrl} className="h-11 w-11 text-lg" />
                <AccountName account={current} />
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
              </div>

              {others.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => void switchTo(account)}
                  disabled={busyId !== null}
                  aria-label={`Switch to @${account.username}`}
                  className={`${ROW} transition-colors active:bg-foreground/[0.06] disabled:opacity-60`}
                >
                  <Avatar username={account.username} avatarUrl={account.avatarUrl} className="h-11 w-11 text-lg" />
                  <AccountName account={account} />
                  {busyId === account.id ? (
                    <Spinner className="h-5 w-5 text-muted" />
                  ) : (
                    <span className="h-6 w-6 rounded-full ring-1 ring-border" aria-hidden />
                  )}
                </button>
              ))}

              {canAdd && (
                <button
                  type="button"
                  onClick={() => void addAccount()}
                  disabled={busyId !== null}
                  className={`${ROW} transition-colors active:bg-foreground/[0.06] disabled:opacity-60`}
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-foreground/[0.08]">
                    {busyId === "add" ? <Spinner className="h-5 w-5 text-muted" /> : <PlusIcon className="h-5 w-5" />}
                  </span>
                  <span className="flex-1 text-[0.9375rem] font-semibold">Add account</span>
                </button>
              )}
            </div>

            {error && (
              <p role="alert" className="px-4 pt-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Settings' Accounts group: the other accounts on this device, tap to
 * switch, and Add account. */
export function AccountSettingsList({ others, canAdd }: { others: SwitchableAccount[]; canAdd: boolean }) {
  const { busyId, error, switchTo, addAccount } = useAccountSwitching("settings");

  return (
    <div className="flex flex-col gap-2">
      <GroupedList
        footer={
          canAdd
            ? "Stay signed in to up to 5 accounts and switch between them without logging out."
            : "You have the most accounts one phone can hold. Log out of one to add another."
        }
      >
        {others.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => void switchTo(account)}
            disabled={busyId !== null}
            aria-label={`Switch to @${account.username}`}
            className="relative flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-foreground/[0.06] disabled:opacity-60"
            style={{ "--row-inset": "4rem" } as CSSProperties}
          >
            <Avatar username={account.username} avatarUrl={account.avatarUrl} className="h-9 w-9 text-sm" />
            <AccountName account={account} />
            {busyId === account.id ? (
              <Spinner className="h-4 w-4 text-muted" />
            ) : (
              <span className="flex-shrink-0 text-[0.8125rem] font-medium text-accent">Switch</span>
            )}
          </button>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => void addAccount()}
            disabled={busyId !== null}
            className="relative flex min-h-[48px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-foreground/[0.06] disabled:opacity-60"
            style={{ "--row-inset": "4rem" } as CSSProperties}
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground/[0.08]">
              {busyId === "add" ? <Spinner className="h-4 w-4 text-muted" /> : <PlusIcon className="h-4 w-4" />}
            </span>
            <span className="flex-1 text-[0.9375rem] text-accent">Add account</span>
          </button>
        )}
      </GroupedList>
      {error && (
        <p role="alert" className="px-4 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** "Back to @name" on the add-account login screen, for someone who
 * changed their mind. */
export function BackToAccountButton({ account }: { account: SwitchableAccount }) {
  const { busyId, error, switchTo } = useAccountSwitching("profile");
  return (
    <div className="mt-5 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void switchTo(account)}
        disabled={busyId !== null}
        className="pressable flex items-center gap-2 text-[0.9375rem] font-medium text-accent disabled:opacity-60"
      >
        {busyId ? <Spinner className="h-4 w-4" /> : null}
        Cancel and go back to @{account.username}
      </button>
      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
