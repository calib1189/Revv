import { redirect } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isAdBillingConfigured } from "@/lib/billing/config";
import { AdCampaignForm } from "@/features/ads/ad-campaign-form";
import { Callout } from "@/components/ui/callout";

/** The ad builder, reached from the /advertise overview's "Create your ad"
 * (or straight from the native app's web handoff, which skips the
 * overview the person already read in the app). */
export default async function NewAdPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advertise/new");

  return (
    <PageShell width="2xl">
      <PageHeader back={{ href: "/advertise", label: "Advertise" }} className="mb-4" />
      {isAdBillingConfigured() ? (
        <AdCampaignForm userId={user.id} />
      ) : (
        <Callout tone="muted">
          Ad billing isn&apos;t set up yet. Add{" "}
          <code className="text-foreground">STRIPE_SECRET_KEY</code> to enable it.
        </Callout>
      )}
    </PageShell>
  );
}
