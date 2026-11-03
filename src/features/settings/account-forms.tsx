"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  changeEmailAction,
  changePasswordAction,
  type AccountFormState,
} from "@/features/settings/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionTitle } from "@/components/ui/grouped-list";
import { CheckIcon } from "@/components/ui/icons";

const initial: AccountFormState = { error: null, success: null };

function Result({ state }: { state: AccountFormState }) {
  if (state.error) return <p role="alert" className="text-[0.8125rem] text-danger">{state.error}</p>;
  if (state.success) {
    return (
      <p role="status" className="flex items-start gap-1.5 text-[0.8125rem] text-success">
        <CheckIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        {state.success}
      </p>
    );
  }
  return null;
}

export function AccountForms({
  currentEmail,
  signsInWithPassword,
}: {
  currentEmail: string | null;
  /** False for an account that has only ever used Apple/Google sign-in. */
  signsInWithPassword: boolean;
}) {
  const [emailState, emailAction, emailPending] = useActionState(changeEmailAction, initial);
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, initial);
  const passwordFormRef = useRef<HTMLFormElement>(null);

  // A password that saved shouldn't sit in the fields afterwards.
  useEffect(() => {
    if (passwordState.success) passwordFormRef.current?.reset();
  }, [passwordState]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle>Email</SectionTitle>
        <form action={emailAction} className="glass-raised elev-1 flex flex-col gap-3 rounded-[22px] p-5">
          <p className="text-[0.875rem] text-muted">
            Signed in as <span className="font-medium text-foreground">{currentEmail ?? "no email"}</span>
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-email">New email</Label>
            <Input id="new-email" name="email" type="email" autoComplete="email" inputMode="email" required />
          </div>
          <Result state={emailState} />
          <Button type="submit" disabled={emailPending} className="h-11 font-semibold">
            {emailPending ? "Sending…" : "Change email"}
          </Button>
        </form>
      </section>

      <section>
        <SectionTitle>Password</SectionTitle>
        <form
          ref={passwordFormRef}
          action={passwordAction}
          className="glass-raised elev-1 flex flex-col gap-3 rounded-[22px] p-5"
        >
          {!signsInWithPassword && (
            <p className="text-[0.875rem] leading-relaxed text-muted">
              You sign in with Apple or Google. Setting a password lets you sign in with your email
              too.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <Result state={passwordState} />
          <Button type="submit" disabled={passwordPending} className="h-11 font-semibold">
            {passwordPending ? "Saving…" : signsInWithPassword ? "Change password" : "Set password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
