import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getBusinessProfileById } from "@/lib/db/business-profiles";
import { listBusinessProfileMedia } from "@/lib/db/business-profile-media";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { BackIcon } from "@/components/ui/icons";
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
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link
        href="/settings/business"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <BackIcon className="h-4 w-4" />
        Business Profile
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{profile.place_name}</h1>
      <p className="mb-6 text-sm text-muted">{profile.place_address}</p>

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
    </div>
  );
}
