import { LegalDisclaimer } from "@/features/legal/legal-disclaimer";

export const metadata = { title: "Community Guidelines — SORZA" };

export default function GuidelinesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-2 text-balance text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">Community Guidelines</h1>
      <p className="mb-1 text-[0.875rem] text-muted">Last updated: November 20, 2026.</p>
      <LegalDisclaimer />

      <div className="prose-doc">
        <section>
          <h2 className="mb-2 text-base font-semibold">Post your own build</h2>
          <p>
            Share photos and video of vehicles and modifications you actually own or worked on.
            Don&apos;t pass off someone else&apos;s car or work as your own.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Tag mods honestly</h2>
          <p>
            Hotspot tags point at real parts in your build. Don&apos;t tag a part you don&apos;t
            actually have installed — other people use build pages to make real purchasing
            decisions.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Respect other people</h2>
          <p>
            No harassment, hate speech, threats, or targeted abuse. Disagree about parts and
            builds all you want — attack the argument, not the person.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">No dangerous or illegal content</h2>
          <p>
            Don&apos;t post content that depicts or promotes street racing on public roads,
            reckless driving, or other illegal activity that endangers people.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">No sexual or explicit content</h2>
          <p>
            SORZA is about cars, not people — nudity, sexual content, and sexually explicit
            material are never allowed, regardless of context. Every photo and video is screened
            before it goes live, and accounts that post this kind of content are banned.
          </p>
        </section>

        <section id="child-safety" className="scroll-mt-20">
          <h2 className="mb-2 text-base font-semibold">Child safety</h2>
          <p>
            SORZA has zero tolerance for child sexual abuse and exploitation (CSAE). Any content
            or behavior that sexualizes, exploits, or endangers a minor is prohibited, including
            child sexual abuse material (CSAM), grooming, sexual messages to or about a minor, and
            attempts to move a minor to another app or meet them in person. You must be 13 or older
            to use SORZA.
          </p>
          <p className="mt-3">
            Report it from the post, comment, or profile with Report → Inappropriate content, or
            email sorzasupport@gmail.com. We remove the content, permanently ban the account, and
            report apparent CSAM to the National Center for Missing &amp; Exploited Children
            (NCMEC) and to law enforcement as the law requires. Questions about these standards go
            to sorzasupport@gmail.com.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Fitment and safety</h2>
          <p>
            The fitment calculator does real arithmetic, not a guarantee. If you post advice about
            a modification, be clear about what you verified yourself versus what you&apos;re
            guessing at — someone else may act on it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">No spam</h2>
          <p>
            Don&apos;t flood comments, mass-message people, or use SORZA to push unrelated
            products, links, or scams.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Reporting</h2>
          <p>
            If you see content or behavior that breaks these guidelines, report it from the post
            or profile. Reports go to a moderation queue and every action taken is logged. Filing
            false or bad-faith reports to target another user is itself a violation.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Enforcement</h2>
          <p>
            Depending on severity, we may remove content, warn an account, or suspend it. Repeated
            or serious violations result in permanent removal.
          </p>
        </section>
      </div>
    </div>
  );
}
