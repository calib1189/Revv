"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: HTMLElement, params: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

// Shared across every mount so three forms on the same page (there
// aren't currently, but a bfcache/navigation replay could) never
// inject the script twice.
let scriptPromise: Promise<void> | null = null;
function loadHcaptchaScript(): Promise<void> {
  if (window.hcaptcha) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load hCaptcha"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/** Renders the hCaptcha challenge and writes the solved token into a
 * hidden field named `name` — it rides along with the surrounding
 * <form>'s normal FormData submission, no onSubmit interception
 * needed. Supabase's own CAPTCHA protection (Authentication -> Attack
 * Protection) expects this same token server-side via
 * options.captchaToken on signUp/signInWithPassword/
 * resetPasswordForEmail — see features/auth/actions.ts.
 *
 * Renders nothing and auto-reports "verified" when the site key isn't
 * configured, same fail-open-in-dev pattern as isSupabaseConfigured()
 * elsewhere — local dev without an hCaptcha key shouldn't be unable to
 * log in at all. */
export function Hcaptcha({
  name,
  onVerifiedChange,
}: {
  name: string;
  onVerifiedChange?: (verified: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!SITE_KEY) {
      onVerifiedChange?.(true);
      return;
    }

    let cancelled = false;
    loadHcaptchaScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.hcaptcha) return;
        window.hcaptcha.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          callback: (t: string) => {
            setToken(t);
            onVerifiedChange?.(true);
          },
          "expired-callback": () => {
            setToken("");
            onVerifiedChange?.(false);
          },
          "error-callback": () => {
            setToken("");
            onVerifiedChange?.(false);
          },
        });
      })
      .catch(() => {
        // hCaptcha's script failed to load (network/ad-blocker) — fail
        // open rather than lock every visitor out of auth entirely;
        // Supabase's own rate limits are still the backstop.
        onVerifiedChange?.(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;

  return (
    <div>
      <div ref={containerRef} />
      <input type="hidden" name={name} value={token} />
    </div>
  );
}
