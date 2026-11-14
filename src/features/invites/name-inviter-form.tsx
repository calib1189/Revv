"use client";

import { useActionState } from "react";
import { nameInviterAction, type NameInviterState } from "@/features/invites/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsersIcon } from "@/components/ui/icons";

const initialState: NameInviterState = { error: null, inviterUsername: null };

/** "Who invited you?" for a new account that came in without an invite
 * link remembered (the App Store, or a confirm email opened elsewhere). */
export function NameInviterForm({ defaultValue = "" }: { defaultValue?: string }) {
  const [state, formAction, isPending] = useActionState(nameInviterAction, initialState);

  if (state.inviterUsername) return <InvitedBy username={state.inviterUsername} />;

  return (
    <form action={formAction} className="glass-raised elev-1 rounded-[22px] p-4">
      <label htmlFor="inviter" className="block text-[0.9375rem] font-semibold">
        Did someone invite you?
      </label>
      <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">
        Add their username so it counts toward their invite rewards.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          id="inviter"
          name="inviter"
          defaultValue={defaultValue}
          placeholder="@username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={isPending} className="h-12 flex-shrink-0 px-5 font-semibold">
          {isPending ? "Adding…" : "Add"}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="mt-2 px-1 text-[0.8125rem] font-medium text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function InvitedBy({ username }: { username: string }) {
  return (
    <div className="glass-raised elev-1 flex items-center gap-3 rounded-[22px] p-4">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <UsersIcon className="h-5 w-5" />
      </span>
      <p className="min-w-0 text-[0.9375rem] leading-snug">
        Invited by <span className="font-semibold">@{username}</span>
      </p>
    </div>
  );
}
