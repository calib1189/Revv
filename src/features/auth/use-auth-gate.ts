"use client";

import { useState, type FormEvent } from "react";

export const TERMS_CHECKBOX_ID = "accept-terms";

export type AuthNudge = "terms" | "captcha" | null;

/** The login and signup forms' "agree first" rule. Nobody can sign in
 * until the terms box is ticked (App Store guideline 1.2), but the
 * buttons stay tappable: a greyed-out button that silently ignores taps
 * reads as a frozen app, so a tap instead points at what's missing. */
export function useAuthGate() {
  const [acceptedTerms, setAcceptedTermsState] = useState(false);
  const [captchaVerified, setCaptchaVerifiedState] = useState(false);
  const [nudge, setNudge] = useState<AuthNudge>(null);

  function setAcceptedTerms(accepted: boolean) {
    setAcceptedTermsState(accepted);
    if (accepted) setNudge((n) => (n === "terms" ? null : n));
  }

  function setCaptchaVerified(verified: boolean) {
    setCaptchaVerifiedState(verified);
    if (verified) setNudge((n) => (n === "captcha" ? null : n));
  }

  /** True when the terms still need ticking, after pointing at the box. */
  function blockedOnTerms(): boolean {
    if (acceptedTerms) return false;
    setNudge("terms");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(TERMS_CHECKBOX_ID)
      ?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    return true;
  }

  /** For Google and Apple: may the sign-in start? */
  function allowOAuth(): boolean {
    return !blockedOnTerms();
  }

  /** For the email form: stops the submit (and its server action) when
   * something is missing. React skips a form action whose submit event
   * was prevented, so what they typed stays in the fields. */
  function guardSubmit(event: FormEvent<HTMLFormElement>) {
    if (blockedOnTerms()) {
      event.preventDefault();
      return;
    }
    if (!captchaVerified) {
      event.preventDefault();
      setNudge("captcha");
    }
  }

  return { acceptedTerms, setAcceptedTerms, setCaptchaVerified, nudge, allowOAuth, guardSubmit };
}
