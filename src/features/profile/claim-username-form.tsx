"use client";

import { useActionState } from "react";
import { claimUsernameAction, type ClaimUsernameState } from "@/features/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";

const initialState: ClaimUsernameState = { error: null };

export function ClaimUsernameForm() {
  const [state, formAction, isPending] = useActionState(
    claimUsernameAction,
    initialState,
  );

  return (
    <form action={formAction} className="glass flex flex-col gap-3 rounded-2xl p-4">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <div>
        <Label htmlFor="username">Pick a username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="turbo_dan"
          required
        />
      </div>
      <Button type="submit" disabled={isPending} className="self-start px-4 py-1.5 text-sm">
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
