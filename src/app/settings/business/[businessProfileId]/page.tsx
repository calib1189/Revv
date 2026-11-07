import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getBusinessProfileById } from "@/lib/db/business-profiles";
import { listBusinessProfileMedia } from "@/lib/db/business-profile-media";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { parseBusinessHours } from "@/lib/shops/hours";
import { BusinessProfileEditor } from "@/features/business/business-profile-editor";
import { BusinessDetailsEditor } from "@/features/business/business-details-editor";
import { ChevronRightIcon } from "@/components/ui/icons";

export default async function BusinessProfileEditPage({
  params,
}: {
  params: Promise<{ businessProfileId: string }>;
}) {
  const { businessProfileId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/settings/business/${businessProfileId}`);

  const supabase = await createClient();
  const profile = await getBusinessProfileById(supabase, businessProfileId);
  if (!profile || profile.owner_id !== user.id) notFound();

  const [gallery, logo, cover] = await Promise.all([
    listBusinessProfileMedia(supabase, profile.id),
    profile.logo_media_id ? getMediaById(supabase, profile.logo_media_id) : Promise.resolve(null),
    profile.cover_media_id ? getMediaById(supabase, profile.cover_media_id) : Promise.resolve(null),
  ]);

  const listingHref = `/discover/shop/${encodeURIComponent(profile.place_id)}`;

  return (
    <PageShell>
      <PageHeader
        title={profile.place_name}
        back={{ href: "/settings/business", label: "Business" }}
        description={profile.place_address}
      />

      <Link
        href={listingHref}
        className="pressable glass-raised elev-1 mb-6 flex items-center gap-3 rounded-[22px] px-5 py-4"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold">View your listing</p>
          <p className="mt-0.5 text-[0.8125rem] text-muted">
            {profile.verification_status === "approved"
              ? "See it the way customers do."
              : "Your changes show there once you're verified."}
          </p>
        </div>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted" />
      </Link>

      <div className="flex flex-col gap-6">
        <BusinessProfileEditor
          userId={user.id}
          businessProfileId={profile.id}
          placeId={profile.place_id}
          description={profile.description ?? ""}
          logoUrl={logo ? publicMediaUrl(supabase, logo.storage_path) : null}
          coverUrl={cover ? publicMediaUrl(supabase, cover.storage_path) : null}
          gallery={gallery.map((item) => ({
            id: item.id,
            url: publicMediaUrl(supabase, item.media.storage_path),
          }))}
          verificationStatus={profile.verification_status}
        />

        <BusinessDetailsEditor
          businessProfileId={profile.id}
          initial={{
            tagline: profile.tagline ?? "",
            // ?? [] because these columns don't exist until 0101 is applied.
            services: profile.services ?? [],
            hours: parseBusinessHours(profile.hours),
            phone: profile.phone ?? "",
            website: profile.website_url ?? "",
            instagram: profile.instagram ? `@${profile.instagram}` : "",
          }}
        />
      </div>
    </PageShell>
  );
}
