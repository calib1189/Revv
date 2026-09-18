"use client";

import { useActionState, useState } from "react";
import { updateBioAction, type UpdateBioState } from "@/features/profile/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Callout } from "@/components/ui/callout";

const initialState: UpdateBioState = { error: null };
const MAX_BIO = 300;

export function EditBioForm({ initialBio }: { initialBio: string | null }) {
  const [state, formAction, isPending] = useActionState(
    updateBioAction,
    initialState,
  );
  const [length, setLength] = useState(initialBio?.length ?? 0);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="bio">Bio</Label>
          <span className="numeral px-1 text-[0.75rem] text-muted">
            {length}/{MAX_BIO}
          </span>
        </div>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={MAX_BIO}
          defaultValue={initialBio ?? ""}
          onChange={(e) => setLength(e.target.value.length)}
          placeholder="Tell people about your build."
        />
      </div>
      <Button type="submit" disabled={isPending} className="h-12 w-full font-semibold">
        {isPending ? "Saving…" : "Save Bio"}
      </Button>
    </form>
  );
}
