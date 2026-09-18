import { notFound, redirect } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getBusinessProfileById } from "@/lib/db/business-profiles";
import { listBusinessProfileMedia } from "@/lib/db/business-profile-media";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { BusinessProfileEditor } from "@/features/business/business-profile-editor";

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

  const [gallery, logo] = await Promise.all([
    listBusinessProfileMedia(supabase, profile.id),
    profile.logo_media_id ? getMediaById(supabase, profile.logo_media_id) : Promise.resolve(null),
  ]);

  return (
    <PageShell>
      <PageHeader
        title={profile.place_name}
        back={{ href: "/settings/business", label: "Business" }}
        description={profile.place_address}
      />

      <BusinessProfileEditor
        userId={user.id}
        businessProfileId={profile.id}
        placeId={profile.place_id}
        description={profile.description ?? ""}
        logoUrl={logo ? publicMediaUrl(supabase, logo.storage_path) : null}
        gallery={gallery.map((item) => ({
          id: item.id,
          url: publicMediaUrl(supabase, item.media.storage_path),
        }))}
        verificationStatus={profile.verification_status}
      />
    </PageShell>
  );
}
