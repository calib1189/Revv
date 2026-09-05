import { LegalDisclaimer } from "@/features/legal/legal-disclaimer";

export const metadata = { title: "Terms of Service — SORZA" };

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mb-1 text-sm text-muted">Last updated: August 31, 2026.</p>
      <LegalDisclaimer />

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold">1. Acceptance of these terms</h2>
          <p>
            By creating an account or using SORZA, you agree to these Terms of Service and our
            Privacy Policy. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">2. What SORZA is</h2>
          <p>
            SORZA is a social platform for tracking, sharing, and discussing vehicle builds. It
            combines a social feed (photos, video, comments, follows) with structured build data
            (a garage of vehicles, parts, and modifications you record against them).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">3. Eligibility and accounts</h2>
          <p>
            You must be at least 13 years old to create an account. You are responsible for the
            security of your account and for all activity under it. You must provide accurate
            information and keep your profile up to date.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. Your content</h2>
          <p>
            You own the photos, videos, captions, comments, and build data you post. By posting,
            you grant SORZA a worldwide, non-exclusive, royalty-free license to host, store,
            reproduce, and display that content for the purpose of operating and promoting the
            service (for example, showing your post in the feed or generating a share preview
            image for a public build page). This license ends when you delete the content or your
            account, except where it has already been shared by others or retained for legal
            reasons.
          </p>
          <p className="mt-2">
            You are responsible for making sure you have the right to post what you upload. Do not
            post content that infringes someone else&apos;s copyright, trademark, or other rights.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. AI-assisted features</h2>
          <p>
            Some features use AI to make suggestions — identifying a vehicle from a photo, or
            scoring a build&apos;s overall quality. AI output is always shown as a suggestion with
            its confidence level, never written directly to your garage or build. Nothing is saved
            as fact until you review and confirm it. Photos and captions you post may also be
            screened by an automated moderation check before or after they go live. AI suggestions
            and moderation calls can be wrong; verify anything that matters before relying on it,
            and report anything that slips through.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">6. Fitment calculator</h2>
          <p>
            The fitment tools perform deterministic arithmetic on the numbers you enter (wheel
            width, offset, tire size, and similar). They are not a guarantee that a part will fit
            your vehicle, and they do not replace consulting the part manufacturer, a fitment
            guide specific to your vehicle, or a professional installer. Missing or incorrect
            input produces an &ldquo;insufficient data&rdquo; result rather than a guess — but a
            complete result is still only as good as the numbers you provided.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">7. Prohibited conduct</h2>
          <p>Do not use SORZA to:</p>
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li>Harass, threaten, or impersonate another person</li>
            <li>Post illegal content, or content depicting reckless or illegal driving</li>
            <li>Post spam, scams, or misleading commercial content</li>
            <li>Upload content you don&apos;t have the rights to</li>
            <li>Attempt to bypass rate limits, security controls, or moderation</li>
            <li>Scrape or automate access to the service without permission</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">8. Moderation</h2>
          <p>
            We may remove content, suspend, or terminate accounts that violate these terms or our{" "}
            <a href="/legal/guidelines" className="text-accent hover:underline">
              Community Guidelines
            </a>
            . Reports are reviewed by moderators; every moderation action is logged in an internal
            audit trail. Decisions can be appealed by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">9. Subscriptions and billing</h2>
          <p>
            Paid features, when enabled, are billed through a third-party payment processor
            (Stripe). We never see or store your card details. Subscription state is written only
            by our billing webhook — your account can never grant itself paid access.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">10. Disclaimers and limitation of liability</h2>
          <p>
            SORZA is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum
            extent permitted by law, SORZA is not liable for indirect, incidental, or consequential
            damages arising from your use of the service, including any damage, injury, or loss
            resulting from a modification, part, or fitment decision made using information on the
            platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">11. Changes to these terms</h2>
          <p>
            We may update these terms as the service changes. Material changes will be announced
            in the app before they take effect.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">12. Contact</h2>
          <p>Questions about these terms can be sent to the contact address published on the site.</p>
        </section>
      </div>
    </div>
  );
}
