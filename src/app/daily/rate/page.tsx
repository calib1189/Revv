import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { dailyDateKey } from "@/lib/daily/day";
import { composeRideCars, getOrCreateRideRound } from "@/lib/daily/ride-server";
import { RideRound } from "@/features/daily/ride-round";
import { EmptyState } from "@/components/ui/empty-state";
import { StarIcon } from "@/components/ui/icons";

export const metadata: Metadata = { title: "Rate the Ride · Sorza Daily" };

export default async function RateTheRidePage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/daily/rate")}`);

  const supabase = await createClient();
  let cars: Awaited<ReturnType<typeof composeRideCars>> | null = null;
  try {
    const round = await getOrCreateRideRound(user.id, dailyDateKey());
    cars = await composeRideCars(supabase, user.id, round);
  } catch {
    cars = null;
  }

  return (
    <PageShell width="lg">
      <PageHeader
        title="Rate the Ride"
        back={{ href: "/daily", label: "Daily" }}
        description="Three real garages from the community. Rate each one and see how the rest of SORZA rated it."
      />
      {cars === null ? (
        <EmptyState card icon={<StarIcon />} title="Rate the Ride is almost ready" body="Check back soon." />
      ) : (
        <RideRound cars={cars} />
      )}
    </PageShell>
  );
}
