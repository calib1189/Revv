"use client";

import { useActionState } from "react";
import { updateBioAction, type UpdateBioState } from "@/features/profile/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";

const initialState: UpdateBioState = { error: null };

export function EditBioForm({ initialBio }: { initialBio: string | null }) {
  const [state, formAction, isPending] = useActionState(
    updateBioAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <div>
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={300}
          defaultValue={initialBio ?? ""}
          placeholder="Tell people about your build."
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
