import Link from "next/link";
import { LegalDisclaimer } from "@/features/legal/legal-disclaimer";

export const metadata = { title: "Privacy Policy — SORZA" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-5 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-2 text-balance text-[2.125rem] font-bold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">Privacy Policy</h1>
      <p className="mb-1 text-[0.875rem] text-muted">Last updated: November 13, 2026.</p>
      <LegalDisclaimer />

      <div className="prose-doc">
        <section>
          <h2 className="mb-2 text-base font-semibold">1. What we collect</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Account information: email, username, bio, avatar</li>
            <li>Content you post: photos, videos, captions, comments, messages, and stories</li>
            <li>
              Who has watched each story, so the person who posted it can see their viewers
            </li>
            <li>
              Your votes on story polls and your answers to story questions. Answers go only to
              the person who posted the story, and they can see who voted and how; other viewers
              only ever see the vote totals
            </li>
            <li>
              For physical orders (rank decals, build posters, shirts): your name, shipping
              address, and email, collected at checkout so the order can be printed and delivered
            </li>
            <li>
              Purchases you make, such as points packs and printed products. Card details are
              handled entirely by Stripe or Apple; we never see them
            </li>
            <li>Garage data: vehicles, builds, parts, maintenance records you enter</li>
            <li>
              Photos you submit to AI features (vehicle identification, build rating) and photos
              you post, which are screened by an automated moderation check — each sent to
              Google&apos;s Gemini AI service for that one request
            </li>
            <li>
              Location, only when you grant permission. Used to find nearby shops and sort meets
              by distance, and for those searches it is used once and discarded. If you choose
              &quot;Use my current location&quot; while hosting a meet, those coordinates are saved
              with that meet so others can see how far away it is, and are removed if you delete
              the meet or your account
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
            build — the photo or text you submit is sent to Google&apos;s Gemini AI service to
            produce the result. Each photo you post or add to your story (for a video, one still frame
            from it) is also sent to Gemini for automated moderation screening before it is published. Captions
            and comments are not sent. We do not use your content to train models beyond what the provider&apos;s
            own terms specify. A vehicle identification is shown to you as a suggestion and is only
            saved to your garage if you confirm it. A build rating (the SORZA score) is saved to that
            car as soon as it is produced and appears on the car&apos;s public page; rating the car
            again replaces it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. Who we share it with</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Infrastructure providers (hosting, database, storage) needed to run SORZA</li>
            <li>Google (Gemini AI), which receives the photos and text you submit to AI features, and each photo you post (or one frame of a video) for moderation screening</li>
            <li>Google, for shop search and meet locations, when you use those features — only the coordinates needed for that search</li>
            <li>Stripe, which processes payments made on the web — we never see your card details</li>
            <li>Apple, which processes in-app purchases made in the iPhone app</li>
            <li>Printful, which prints and ships physical orders and receives your name, shipping address, and email for that order</li>
            <li>Resend, which delivers the account emails we send you (such as sign-in and password reset)</li>
            <li>Affiliate partners, only in aggregate/click-through form when you follow an affiliate product link</li>
            <li>Law enforcement, if legally required</li>
          </ul>
          <p className="mt-2">We do not sell your personal information.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. What&apos;s public</h2>
          <p>
            Profiles, vehicles, builds, build ratings, and posts are public by default — that&apos;s
            the point of a social platform. Stories can be watched by anyone for 24 hours after
            you post them, and when you watch someone&apos;s story, they can see that you did.
            Messages, saved posts, and your own notifications are private.
            Reports you file are visible only to you and to moderators.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">6. Your choices</h2>
          <p>
            You can edit or delete your content, block another user, and delete your account at
            any time from settings. Deleting your account removes your profile, vehicles, builds,
            and posts; content already shared by others (e.g. a comment quoting your caption) may
            persist. You can request a copy of your data by{" "}
            <Link href="/legal/support" className="text-accent hover:underline">
              contacting us
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">7. Data retention</h2>
          <p>
            We keep your data while your account is active. A story stops being visible to others
            24 hours after you post it; it stays stored, visible only to you, until you delete it or
            your account, and deleting it removes its photo or video. Order records are kept as long
            as needed for delivery, refunds, and our tax records. Moderation records (reports, audit
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
          <p>
            Questions about this policy can be sent to{" "}
            <Link href="/legal/support" className="text-accent hover:underline">
              our published contact address
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
