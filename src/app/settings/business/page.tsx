import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listBusinessProfilesByOwner } from "@/lib/db/business-profiles";
import { BackIcon } from "@/components/ui/icons";
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
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link href="/settings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <BackIcon className="h-4 w-4" />
        Settings
      </Link>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Business Profile</h1>
      <p className="mb-6 text-sm text-muted">
        Claim your shop to add a logo, photos, and a description to its Discover listing — once
        we verify it&apos;s really yours.
      </p>

      {profiles.length > 0 && (
        <div className="mb-6 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/settings/business/${profile.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition-opacity hover:opacity-80"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profile.place_name}</p>
                <p className="truncate text-xs text-muted">{profile.place_address}</p>
              </div>
              <span
                className={`flex-shrink-0 text-xs font-medium ${
                  profile.verification_status === "approved"
                    ? "text-success"
                    : profile.verification_status === "rejected"
                      ? "text-danger"
                      : "text-muted"
                }`}
              >
                {STATUS_LABEL[profile.verification_status]}
              </span>
            </Link>
          ))}
        </div>
      )}

      <ClaimBusinessButton />
    </div>
  );
}
