import Link from "next/link";

export const metadata = { title: "Support — SORZA" };

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Support</h1>
      <p className="mb-6 text-sm text-muted">
        Questions, problems, or something to report — here&apos;s how to reach us.
      </p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold">Contact</h2>
          <p>
            Email{" "}
            <a href="mailto:calib1189@gmail.com" className="text-accent hover:underline">
              calib1189@gmail.com
            </a>{" "}
            for account issues, bug reports, safety concerns, or anything else. We read every
            message and aim to respond within a few days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Report content or a user</h2>
          <p>
            Every post, comment, and profile has a Report option. Reported content is reviewed
            by SORZA&apos;s moderation team, who can remove content or suspend an account — see
            our{" "}
            <Link href="/legal/guidelines" className="text-accent hover:underline">
              Community Guidelines
            </Link>{" "}
            for what&apos;s not allowed. You can also block another user directly from their
            profile at any time.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Delete your account</h2>
          <p>
            You can permanently delete your account and its data yourself, at any time, without
            contacting anyone: open{" "}
            <Link href="/settings" className="text-accent hover:underline">
              Settings
            </Link>{" "}
            and choose <strong>Delete Account</strong> at the bottom of the page. This is
            permanent — see our{" "}
            <Link href="/legal/privacy" className="text-accent hover:underline">
              Privacy Policy
            </Link>{" "}
            for exactly what gets removed. If you&apos;d rather we do it for you, email the
            address above from the account&apos;s own email and we&apos;ll delete it within a
            few days.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">Legal</h2>
          <p>
            <Link href="/legal/terms" className="text-accent hover:underline">
              Terms of Service
            </Link>{" "}
            ·{" "}
            <Link href="/legal/privacy" className="text-accent hover:underline">
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link href="/legal/guidelines" className="text-accent hover:underline">
              Community Guidelines
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
