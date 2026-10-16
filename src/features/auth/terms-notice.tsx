import Link from "next/link";

/** Shown on both the login and signup pages, directly under the sign-in
 * options. App Store guideline 1.2 requires the terms (with their
 * zero-tolerance policy for objectionable content and abusive users) to
 * be presented before someone registers *or logs in* — login used to
 * show nothing at all, and OAuth users never reach a form with a footer
 * line, so this sits where everyone passes it. */
export function TermsNotice({ action }: { action: "log in" | "create an account" }) {
  return (
    <p className="mt-6 text-center text-[0.75rem] leading-relaxed text-muted">
      By continuing, or when you {action}, you agree to SORZA&apos;s{" "}
      <Link href="/legal/terms" className="font-medium text-accent">
        Terms of Service
      </Link>
      , including our zero-tolerance policy for objectionable content and abusive users, and{" "}
      <Link href="/legal/privacy" className="font-medium text-accent">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
