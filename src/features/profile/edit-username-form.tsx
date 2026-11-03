"use client";

import { useActionState, useEffect, useState } from "react";
import {
  changeUsernameAction,
  checkUsernameAvailabilityAction,
  type ChangeUsernameState,
} from "@/features/profile/actions";
import { validateUsername } from "@/lib/validation/username";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { CheckIcon } from "@/components/ui/icons";
import { SITE_URL } from "@/lib/site-url";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const initialState: ChangeUsernameState = { error: null, changedTo: null };
const CHECK_DELAY_MS = 400;

type Availability =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" };

/** Lowercases as you type and drops anything a username can't contain,
 * so the field never holds something that's only rejected on save. */
function normalize(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

export function EditUsernameForm({ currentUsername }: { currentUsername: string }) {
  const [state, formAction, isPending] = useActionState(changeUsernameAction, initialState);
  const [savedUsername, setSavedUsername] = useState(currentUsername);
  const [value, setValue] = useState(currentUsername);
  const [availability, setAvailability] = useState<Availability>({ status: "idle" });

  // After a successful save, the new name is the one to compare against.
  useEffect(() => {
    if (state.changedTo) void Promise.resolve().then(() => setSavedUsername(state.changedTo!));
  }, [state.changedTo]);

  // Checks the name a moment after typing stops, not on every key.
  useEffect(() => {
    if (value === savedUsername) {
      void Promise.resolve().then(() => setAvailability({ status: "idle" }));
      return;
    }
    const formatError = validateUsername(value);
    if (formatError) {
      void Promise.resolve().then(() => setAvailability({ status: "invalid", message: formatError }));
      return;
    }
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setAvailability({ status: "checking" });
    });
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailabilityAction(value);
        if (cancelled) return;
        if (result.available === null) {
          setAvailability({ status: "invalid", message: result.error ?? "That username can't be used." });
        } else {
          setAvailability({ status: result.available ? "available" : "taken" });
        }
      } catch {
        if (!cancelled) setAvailability({ status: "idle" });
      }
    }, CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, savedUsername]);

  const canSave = value !== savedUsername && availability.status === "available" && !isPending;
  const justChanged = state.changedTo !== null && state.changedTo === value;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <div>
        <Label htmlFor="username">Username</Label>
        <div className="flex gap-2">
          <div className="glass-inset flex h-12 min-w-0 flex-1 items-center rounded-[14px] px-4 transition-[box-shadow,border-color] focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/15">
            <span className="text-[0.9375rem] text-muted">@</span>
            <input
              id="username"
              name="username"
              value={value}
              onChange={(e) => setValue(normalize(e.target.value))}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              aria-describedby="username-status"
              className="h-full min-w-0 flex-1 bg-transparent pl-0.5 text-[0.9375rem] outline-none"
            />
          </div>
          <Button type="submit" disabled={!canSave} className="h-12 flex-shrink-0 px-5 font-semibold">
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>

        <p id="username-status" aria-live="polite" className="mt-1.5 min-h-[1.25rem] px-1 text-[0.8125rem]">
          {justChanged ? (
            <span className="flex items-center gap-1 text-success">
              <CheckIcon className="h-3.5 w-3.5" />
              Changed. Your profile is now {SITE_HOST}/u/{value}
            </span>
          ) : availability.status === "invalid" ? (
            <span className="text-danger">{availability.message}</span>
          ) : availability.status === "checking" ? (
            <span className="text-muted">Checking…</span>
          ) : availability.status === "available" ? (
            <span className="flex items-center gap-1 text-success">
              <CheckIcon className="h-3.5 w-3.5" />@{value} is available
            </span>
          ) : availability.status === "taken" ? (
            <span className="text-danger">That username is taken.</span>
          ) : (
            <span className="text-muted">Links to your old username stop working once you change it.</span>
          )}
        </p>
      </div>
    </form>
  );
}
