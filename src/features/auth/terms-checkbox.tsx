"use client";

import Link from "next/link";
import { TERMS_CHECKBOX_ID } from "@/features/auth/use-auth-gate";

/** Sits above every sign-in option on the login and signup forms, and
 * none of them (email, Google, Apple) goes through until it's checked.
 * App Store guideline 1.2 requires the terms — including the
 * zero-tolerance policy for objectionable content and abusive users — to
 * be presented and agreed to before someone registers or logs in.
 *
 * `attention` is set when someone taps a sign-in button without ticking
 * it, so the tap explains itself instead of doing nothing. */
export function TermsCheckbox({
  checked,
  onChange,
  attention = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  attention?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        id={TERMS_CHECKBOX_ID}
        className={`flex cursor-pointer items-start gap-3 rounded-2xl glass-inset px-3.5 py-3 transition-[outline-color] ${
          attention ? "outline-2 outline-offset-2 outline-accent" : "outline-2 outline-offset-2 outline-transparent"
        }`}
      >
        <input
          type="checkbox"
          name="acceptTerms"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={attention ? `${TERMS_CHECKBOX_ID}-hint` : undefined}
          className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer accent-[var(--accent)]"
        />
        <span className="text-[0.8125rem] leading-relaxed text-muted">
          I agree to SORZA&apos;s{" "}
          <Link href="/legal/terms" className="font-medium text-accent">
            Terms of Use
          </Link>
          , including the zero-tolerance policy for objectionable content and abusive users, and the{" "}
          <Link href="/legal/privacy" className="font-medium text-accent">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {attention && (
        <p id={`${TERMS_CHECKBOX_ID}-hint`} role="alert" className="px-1 text-[0.8125rem] font-medium text-accent">
          Tick the box to agree to the terms first.
        </p>
      )}
    </div>
  );
}
