import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { isBillingConfigured } from "@/lib/billing/config";
import { getSubscriptionForUser } from "@/lib/db/subscriptions";
import { SubscribeButton } from "@/features/billing/subscribe-button";
import { Callout } from "@/components/ui/callout";
import Link from "next/link";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/billing");

  const { success } = await searchParams;

  if (!isBillingConfigured()) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
        <Link href="/settings" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
          ← Settings
        </Link>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Billing
        </h1>
        <Callout tone="muted">
          Billing isn&apos;t connected yet. Add{" "}
          <code className="text-foreground">STRIPE_SECRET_KEY</code> and{" "}
          <code className="text-foreground">STRIPE_PRICE_ID</code> to enable
          subscriptions.
        </Callout>
      </div>
    );
  }

  let subscription = null;
  try {
    const supabase = await createClient();
    subscription = await getSubscriptionForUser(supabase, user.id);
  } catch {
    subscription = null;
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link href="/settings" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← Settings
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Billing</h1>

      {success && (
        <div className="mb-6">
          <Callout tone="muted">
            Checkout complete — your subscription will show here once Stripe
            confirms it (usually within a few seconds).
          </Callout>
        </div>
      )}

      {subscription?.status === "active" ? (
        <div className="glass rounded-2xl p-4">
          <p className="text-sm font-medium text-success">
            Your subscription is active.
          </p>
          {subscription.current_period_end && (
            <p className="mt-1 text-xs text-muted">
              Renews{" "}
              {new Date(subscription.current_period_end).toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric", year: "numeric" },
              )}
              .
            </p>
          )}
        </div>
      ) : (
        <div className="glass rounded-2xl p-4">
          <p className="mb-4 text-sm text-muted">
            {subscription
              ? `Subscription ${subscription.status}.`
              : "You're not subscribed yet."}
          </p>
          <SubscribeButton />
        </div>
      )}
    </div>
  );
}
