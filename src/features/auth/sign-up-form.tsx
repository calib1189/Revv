"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";

const initialState: AuthActionState = { error: null };

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(
    signUp,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="turbo_dan"
          required
        />
      </div>

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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
