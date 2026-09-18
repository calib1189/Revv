import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listBusinessProfilesByOwner } from "@/lib/db/business-profiles";
import { ShoppingBagIcon } from "@/components/ui/icons";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import { ClaimBusinessButton } from "@/features/business/claim-business-button";

const STATUS_LABEL: Record<string, string> = {
  none: "Not submitted",
  pending: "Pending review",
  approved: "Verified",
  rejected: "Not approved",
};

export default async function BusinessSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/business");

  const supabase = await createClient();
  let profiles: Awaited<ReturnType<typeof listBusinessProfilesByOwner>> = [];
  try {
    profiles = await listBusinessProfilesByOwner(supabase, user.id);
  } catch {
    profiles = [];
  }

  return (
    <PageShell>
      <PageHeader
        title="Business Profile"
        back={{ href: "/settings", label: "Settings" }}
        description="Claim your shop to add a logo, photos, and a description to its Discover listing, once we verify it's really yours."
      />

      {profiles.length > 0 && (
        <section className="mb-6">
          <SectionTitle>Your businesses</SectionTitle>
          <GroupedList>
            {profiles.map((profile) => (
              <GroupedRow
                key={profile.id}
                href={`/settings/business/${profile.id}`}
                label={profile.place_name}
                detail={profile.place_address}
                icon={
                  <RowIcon color="#34c759">
                    <ShoppingBagIcon />
                  </RowIcon>
                }
                value={
                  <span
                    className={
                      profile.verification_status === "approved"
                        ? "text-success"
                        : profile.verification_status === "rejected"
                          ? "text-danger"
                          : ""
                    }
                  >
                    {STATUS_LABEL[profile.verification_status]}
                  </span>
                }
              />
            ))}
          </GroupedList>
        </section>
      )}

      <ClaimBusinessButton />
    </PageShell>
  );
}
