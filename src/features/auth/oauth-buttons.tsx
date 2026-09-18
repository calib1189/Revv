"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon, AppleIcon } from "@/components/ui/icons";

export function OAuthButtons() {
  const [pending, setPending] = useState<"google" | "apple" | null>(null);

  async function handleOAuth(provider: "google" | "apple") {
    setPending(provider);
    const supabase = createClient();

    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      // Google (and, per Apple's own guidance, Apple too) refuses to show
      // its login page inside an app's embedded WebView — it has to run
      // in the system browser. skipBrowserRedirect gets us the login URL
      // without Supabase auto-navigating this WebView to it; Browser.open
      // shows it in an SFSafariViewController instead. The custom-scheme
      // redirectTo is what hands control back — see native-app-bridge.tsx
      // for the other half, which catches it and finishes the flow.
      const { Browser } = await import("@capacitor/browser");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: "sorza://auth/callback", skipBrowserRedirect: true },
      });
      if (error || !data.url) {
        setPending(null);
        return;
      }
      await Browser.open({ url: data.url });
      setPending(null);
      return;
    }

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
        className="pressable flex h-12 items-center justify-center gap-2.5 rounded-full border border-black/10 bg-white px-4 text-[0.9375rem] font-semibold text-[#1f1f1f] hover:opacity-90 disabled:opacity-60"
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {pending === "google" ? "Redirecting…" : "Continue with Google"}
      </button>
      <button
        type="button"
        disabled={pending !== null}
        onClick={() => handleOAuth("apple")}
        className="pressable flex h-12 items-center justify-center gap-2.5 rounded-full bg-black px-4 text-[0.9375rem] font-semibold text-white ring-1 ring-inset ring-white/15 hover:opacity-90 disabled:opacity-60"
      >
        <AppleIcon className="h-[18px] w-[18px]" />
        {pending === "apple" ? "Redirecting…" : "Continue with Apple"}
      </button>

      <div className="my-2 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[0.8125rem] text-muted">or use email</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
