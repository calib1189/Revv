"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  claimUsernameAction,
  checkUsernameAvailabilityAction,
  type ClaimUsernameState,
} from "@/features/profile/actions";
import { signOut } from "@/features/auth/actions";
import { PushTokenField } from "@/features/push/push-token-field";
import { validateUsername } from "@/lib/validation/username";
import { isTutorialBlockedPath } from "@/lib/tutorial/steps";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CheckIcon } from "@/components/ui/icons";

const initialState: ClaimUsernameState = { error: null, claimed: null };
const CHECK_DELAY_MS = 400;

type Availability =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "checking" }
  | { status: "available" }
  | { status: "taken" };

/** Lowercases as you type and drops anything a username can't contain. */
function normalize(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
}

/**
 * The required "pick your username" step for Google and Apple signups,
 * shown over the whole app until they save one (FirstRunGate decides).
 * Pre-filled with a free name built from what their provider shared, so
 * most people only tap Continue. Sign-in and legal pages stay reachable
 * underneath, and Sign out is the way out for the wrong account.
 */
export function ChooseUsernameScreen({ suggestion }: { suggestion: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(claimUsernameAction, initialState);
  const [value, setValue] = useState(suggestion ?? "");
  const [availability, setAvailability] = useState<Availability>(
    suggestion ? { status: "available" } : { status: "idle" },
  );

  // Saved: re-render the layout, which swaps this for the walkthrough.
  useEffect(() => {
    if (state.claimed) router.refresh();
  }, [state.claimed, router]);

  // Checks the name a moment after typing stops, not on every key.
  useEffect(() => {
    if (value === "") {
      void Promise.resolve().then(() => setAvailability({ status: "idle" }));
      return;
    }
    if (value === suggestion) {
      void Promise.resolve().then(() => setAvailability({ status: "available" }));
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
  }, [value, suggestion]);

  if (isTutorialBlockedPath(pathname)) return null;

  const saving = isPending || Boolean(state.claimed);
  const canSave = availability.status === "available" && !saving;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-username-title"
      className="fixed inset-0 z-[95] overflow-y-auto bg-background"
    >
      <div className="mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+3.5rem)]">
        <Image src="/logo-mark.png" alt="" width={44} height={44} priority className="animate-section-rise" />
        <h1
          id="choose-username-title"
          className="animate-section-rise mt-8 text-balance text-[2rem] font-bold leading-[1.1] tracking-[-0.03em]"
        >
          Pick your username
        </h1>
        <p className="animate-section-rise mt-3 text-[1rem] leading-relaxed text-muted" style={{ animationDelay: "60ms" }}>
          It&apos;s how people find you, tag you and know your builds on SORZA. You can change it later in Settings.
        </p>

        <form action={formAction} className="animate-section-rise mt-8 flex flex-col gap-3" style={{ animationDelay: "120ms" }}>
          {state.error && <Callout tone="danger">{state.error}</Callout>}
          <label htmlFor="choose-username" className="sr-only">
            Username
          </label>
          <div className="glass-inset flex h-14 items-center rounded-[16px] px-4 transition-[box-shadow,border-color] focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/15">
            <span className="text-[1.0625rem] text-muted">@</span>
            <input
              id="choose-username"
              name="username"
              value={value}
              onChange={(e) => setValue(normalize(e.target.value))}
              placeholder="turbo_dan"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              maxLength={24}
              aria-describedby="choose-username-status"
              className="h-full min-w-0 flex-1 bg-transparent pl-0.5 text-[1.0625rem] outline-none placeholder:text-muted/60"
            />
          </div>

          <p id="choose-username-status" aria-live="polite" className="min-h-[1.25rem] px-1 text-[0.8125rem]">
            {availability.status === "invalid" ? (
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
              <span className="text-muted">Lowercase letters, numbers and underscores, 3 to 24 characters.</span>
            )}
          </p>

          <Button type="submit" disabled={!canSave} className="mt-1 h-12 w-full text-[1rem] font-semibold">
            {saving ? "Saving…" : "Continue"}
          </Button>
        </form>

        <form action={signOut} className="mt-auto pt-10 text-center">
          <PushTokenField />
          <button type="submit" className="px-3 py-2 text-[0.875rem] font-medium text-muted">
            Wrong account? Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
