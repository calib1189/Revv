import Link from "next/link";
import type { Metadata } from "next";
import { LegalDisclaimer } from "@/features/legal/legal-disclaimer";

export const metadata: Metadata = {
  title: "Sorza Daily official rules",
  description: "How Sorza Daily challenges and their prizes work.",
};

const CONTACT = "sorzasupport@gmail.com";

/** The official rules for Sorza Daily, linked from any challenge that
 * has a prize. */
export default function DailyRulesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-2 text-balance text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
        Sorza Daily official rules
      </h1>
      <p className="mb-1 text-[0.875rem] text-muted">Last updated: November 10, 2026.</p>
      <LegalDisclaimer />

      <div className="prose-doc">
        <section>
          <h2 className="mb-2 text-base font-semibold">1. No purchase necessary</h2>
          <p>
            Entering and voting are free. Buying anything, including points or cosmetics, never improves your chances of
            winning.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">2. Who runs it</h2>
          <p>
            Sorza Daily is run by SORZA. On a sponsored day, the business named on the challenge (&ldquo;Presented
            by&rdquo;) provides that day&apos;s prize. Apple is not a sponsor of, and is not involved in, Sorza Daily or
            any of its prizes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">3. Who can enter</h2>
          <p>
            Anyone with a SORZA account in good standing and a confirmed email address. To accept a prize, a winner must
            be 18 or older, or have a parent or guardian accept it for them. Void where prohibited.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. How to enter</h2>
          <p>
            Each challenge runs from midnight to midnight US Central time. Enter once per challenge with a photo that fits
            the challenge and follows the{" "}
            <Link href="/legal/guidelines" className="text-accent hover:underline">
              community guidelines
            </Link>
            . You can change or remove your entry until the challenge ends. Your photo must be your own.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. How the winner is decided</h2>
          <p>
            Members vote during the challenge, one vote each. The entry with the most votes when it ends wins; an entry
            needs at least one vote to place. If entries tie for first, the prize goes to the tied entry that was
            submitted first. SORZA&apos;s AI rating does not decide the winner.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">6. Prizes</h2>
          <p>
            The prize is the one shown on the challenge, plus the usual points. Prizes can&apos;t be swapped for cash
            unless the sponsor offers that. SORZA contacts the winner in the app within 3 days of the challenge ending.
            If the winner doesn&apos;t reply within 14 days, the prize goes to the next place. Physical prizes ship to
            addresses in the United States. Winners are responsible for any taxes on their prize.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">7. Your information</h2>
          <p>
            To deliver a sponsored prize, SORZA shares the winner&apos;s username and the delivery details they give us
            with that sponsor, and only for that purpose. The winner&apos;s username and entry are shown with the results.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">8. Fair play</h2>
          <p>
            Entries or votes from fake or duplicate accounts, stolen photos, or anything else meant to game the results
            are disqualified, and the prize goes to the next eligible entry.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">9. Questions</h2>
          <p>
            Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-accent hover:underline">
              {CONTACT}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
