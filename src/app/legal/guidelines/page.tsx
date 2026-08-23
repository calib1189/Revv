import { LegalDraftNotice } from "@/features/legal/legal-draft-notice";

export const metadata = { title: "Community Guidelines — REVV" };

export default function GuidelinesPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Community Guidelines</h1>
      <p className="mb-6 text-sm text-muted">Last updated: draft, not yet published.</p>
      <LegalDraftNotice />

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground">
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
            Don&apos;t flood comments, mass-message people, or use REVV to push unrelated
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
