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
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <div>
        <Label htmlFor="displayName">Name</Label>
        <Input
          id="displayName"
          name="displayName"
          maxLength={50}
          defaultValue={initialDisplayName ?? ""}
          placeholder="Shown above your @username"
        />
      </div>
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
