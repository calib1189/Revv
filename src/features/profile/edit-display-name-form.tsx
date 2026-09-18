"use client";

import { useActionState } from "react";
import { updateDisplayNameAction, type UpdateDisplayNameState } from "@/features/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";

const initialState: UpdateDisplayNameState = { error: null };

export function EditDisplayNameForm({ initialDisplayName }: { initialDisplayName: string | null }) {
  const [state, formAction, isPending] = useActionState(
    updateDisplayNameAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <div>
        <Label htmlFor="displayName">Name</Label>
        <div className="flex gap-2">
          <Input
            id="displayName"
            name="displayName"
            maxLength={50}
            defaultValue={initialDisplayName ?? ""}
            placeholder="Shown above your @username"
          />
          <Button type="submit" disabled={isPending} className="h-12 flex-shrink-0 px-5 font-semibold">
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}
