"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestPasswordReset, type AuthActionState } from "@/features/auth/actions";
import { Hcaptcha } from "@/features/auth/hcaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";

const initialState: AuthActionState = { error: null };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );
  const [captchaVerified, setCaptchaVerified] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Callout tone="danger">{state.error}</Callout>}

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

      <Hcaptcha name="captchaToken" onVerifiedChange={setCaptchaVerified} />

      <Button type="submit" disabled={isPending || !captchaVerified} className="mt-2 w-full">
        {isPending ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-foreground underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
