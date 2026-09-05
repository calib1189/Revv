import { LegalDisclaimer } from "@/features/legal/legal-disclaimer";

export const metadata = { title: "Privacy Policy — SORZA" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mb-1 text-sm text-muted">Last updated: August 31, 2026.</p>
      <LegalDisclaimer />

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold">1. What we collect</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Account information: email, username, bio, avatar</li>
            <li>Content you post: photos, videos, captions, comments, messages</li>
            <li>Garage data: vehicles, builds, parts, maintenance records you enter</li>
            <li>
              Photos you submit to AI features (vehicle identification, build rating) and content
              you post, which may be screened by an automated moderation check — each sent to the
              configured AI provider for that one request
            </li>
            <li>
              Location, only when you grant permission — used to find nearby shops and sort meets
              by distance. Never stored against your account; used for that one search and
              discarded
            </li>
            <li>
              A push notification token, only if you opt in to notifications — used solely to
              deliver notifications to your device
            </li>
            <li>Usage events: pages viewed and actions taken, used for the analytics you see reflected in product usage (not sold to third parties)</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">2. How we use it</h2>
          <p>
            To operate the service: render your feed, garage, and build pages; power search and
            discovery; send notifications you&apos;ve triggered (likes, comments, follows,
            messages); and improve the product based on aggregate usage patterns.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">3. AI processing</h2>
          <p>
            When you use an AI-assisted feature — identifying a vehicle from a photo or rating a
            build — the photo or text you submit is sent to the AI provider configured for that
            feature. Posted photos and captions may also be sent for automated moderation
            screening. We do not use your content to train models beyond what the provider&apos;s
            own terms specify. AI output is shown to you as a suggestion and is never saved to
            your account until you confirm it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. Who we share it with</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Infrastructure providers (hosting, database, storage) needed to run SORZA</li>
            <li>The AI providers behind AI-assisted features and moderation, for the request you initiate</li>
            <li>Google, for shop search and meet locations, when you use those features — only the coordinates needed for that search</li>
            <li>Stripe, for billing, if you subscribe to a paid feature — we never see your card details</li>
            <li>Affiliate partners, only in aggregate/click-through form when you follow an affiliate product link</li>
            <li>Law enforcement, if legally required</li>
          </ul>
          <p className="mt-2">We do not sell your personal information.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. What&apos;s public</h2>
          <p>
            Profiles, vehicles, builds, and posts are public by default — that&apos;s the point of
            a social platform. Messages, saved posts, and your own notifications are private.
            Reports you file are visible only to you and to moderators.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">6. Your choices</h2>
          <p>
            You can edit or delete your content, block another user, and delete your account at
            any time from settings. Deleting your account removes your profile, vehicles, builds,
            and posts; content already shared by others (e.g. a comment quoting your caption) may
            persist. You can request a copy of your data by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">7. Data retention</h2>
          <p>
            We keep your data while your account is active. Moderation records (reports, audit
            logs) are retained after content removal to maintain an accountability trail, even if
            the underlying content is deleted.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">8. Children&apos;s privacy</h2>
          <p>SORZA is not directed at children under 13, and we do not knowingly collect their data.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">9. Security</h2>
          <p>
            Access to your data is restricted by row-level security policies at the database
            layer — by default, you can only read public content and write your own rows. We
            still recommend a strong, unique password for your account.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">10. Changes to this policy</h2>
          <p>We&apos;ll announce material changes in the app before they take effect.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">11. Contact</h2>
          <p>Questions about this policy can be sent to the contact address published on the site.</p>
        </section>
      </div>
    </div>
  );
}
