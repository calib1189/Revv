import Link from "next/link";

/** Shown directly beside every button that sends a person's photos to an
 * AI service.
 *
 * Apple's review guidelines require that people are clearly told when
 * their personal data goes to a third-party AI service, and agree to it
 * before it happens. Naming the recipient matters as much as saying
 * "AI": "an AI provider" tells nobody where their photos are going.
 * The disclosure sits right next to the action, so pressing the button is
 * itself the informed choice, rather than living only on a policy page
 * that nobody reads before tapping.
 *
 * Kept in one component so the wording and the recipient can't drift
 * between the rating panel and the vehicle-identification panel. What
 * happens to the result differs, so each says its own: a vehicle guess
 * waits for you to confirm it, a build rating saves as soon as it's made
 * (CLAUDE.md invariant 5's exception). */
export function AiDisclosure({ kind, className = "" }: { kind: "identify" | "rating"; className?: string }) {
  return (
    <p className={`text-[0.75rem] leading-snug text-muted ${className}`}>
      Tapping this sends your photos to Google&apos;s Gemini AI.{" "}
      {kind === "identify"
        ? "Its guess is only saved to your garage if you confirm it."
        : "The score it gives is saved to your car right away and shows on its page."}{" "}
      <Link href="/legal/privacy" className="underline underline-offset-2">
        Privacy Policy
      </Link>
    </p>
  );
}
