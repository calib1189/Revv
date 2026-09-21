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
 * between the rating panel and the vehicle-identification panel. */
export function AiDisclosure({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[0.75rem] leading-snug text-muted ${className}`}>
      Tapping this sends your photos to Google&apos;s Gemini AI to produce the result. Nothing is
      saved to your account until you confirm it.{" "}
      <Link href="/legal/privacy" className="underline underline-offset-2">
        Privacy Policy
      </Link>
    </p>
  );
}
