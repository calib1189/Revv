"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon, AppleIcon } from "@/components/ui/icons";

export function OAuthButtons() {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);

  async function handleOAuth(provider: "google" | "apple") {
    setPending(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setPending(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => handleOAuth("google")}
        className="flex items-center justify-center gap-2.5 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <GoogleIcon className="h-4 w-4" />
        {pending === "google" ? "Redirecting…" : "Continue with Google"}
      </button>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => handleOAuth("apple")}
        className="flex items-center justify-center gap-2.5 rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <AppleIcon className="h-4 w-4" />
        {pending === "apple" ? "Redirecting…" : "Continue with Apple"}
      </button>

      <div className="my-1 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
