"use client";

import Link from "next/link";

/** Sits above every sign-in option on the login and signup forms, and
 * every one of them (email, Google, Apple) stays disabled until it's
 * checked. App Store guideline 1.2 requires the terms — including the
 * zero-tolerance policy for objectionable content and abusive users — to
 * be presented and agreed to before someone registers or logs in. */
export function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl glass-inset px-3.5 py-3">
      <input
        type="checkbox"
        name="acceptTerms"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
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
  );
}
