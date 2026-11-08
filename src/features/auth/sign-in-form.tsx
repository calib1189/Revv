"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type AuthActionState } from "@/features/auth/actions";
import { OAuthButtons } from "@/features/auth/oauth-buttons";
import { TermsCheckbox } from "@/features/auth/terms-checkbox";
import { Hcaptcha } from "@/features/auth/hcaptcha";
import { useAuthGate } from "@/features/auth/use-auth-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";

const initialState: AuthActionState = { error: null };

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(
    signIn,
    initialState,
  );
  const { acceptedTerms, setAcceptedTerms, setCaptchaVerified, nudge, allowOAuth, guardSubmit } = useAuthGate();

  return (
    <form action={formAction} onSubmit={guardSubmit} className="flex flex-col gap-4">
      {state.error && <Callout tone="danger">{state.error}</Callout>}
      <TermsCheckbox checked={acceptedTerms} onChange={setAcceptedTerms} attention={nudge === "terms"} />
      <OAuthButtons allowStart={allowOAuth} />
      <input type="hidden" name="next" value={next ?? "/feed"} />

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <Label htmlFor="password" className="mb-0">
            Password
          </Label>
          <Link href="/forgot-password" className="px-1 text-[0.8125rem] font-medium text-accent">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Hcaptcha name="captchaToken" onVerifiedChange={setCaptchaVerified} />
      {nudge === "captcha" && (
        <p role="alert" className="-mt-2 px-1 text-[0.8125rem] font-medium text-accent">
          Tick &ldquo;I am human&rdquo; above first.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="mt-2 h-12 w-full text-[1rem] font-semibold">
        {isPending ? "Logging in…" : "Log in"}
      </Button>

      <p className="text-center text-[0.875rem] text-muted">
        New to SORZA?{" "}
        <Link href="/signup" className="font-semibold text-accent">
          Create an account
        </Link>
      </p>
    </form>
  );
}
