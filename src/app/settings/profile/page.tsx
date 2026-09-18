import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { EditAvatarForm } from "@/features/profile/edit-avatar-form";
import { EditDisplayNameForm } from "@/features/profile/edit-display-name-form";
import { EditBioForm } from "@/features/profile/edit-bio-form";
import { PageHeader, PageShell } from "@/components/ui/page-header";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/profile");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);

  const avatarMedia = profile?.avatar_media_id
    ? await getMediaById(supabase, profile.avatar_media_id)
    : null;
  const avatarUrl = avatarMedia ? publicMediaUrl(supabase, avatarMedia.storage_path) : null;

  return (
    <PageShell>
      <PageHeader title="Edit Profile" back={{ href: "/settings", label: "Settings" }} />

      {profile && (
        <div className="mb-8">
          <EditAvatarForm
            userId={user.id}
            username={profile.username}
            initialAvatarUrl={avatarUrl}
          />
          <p className="mt-1 text-center text-[0.875rem] text-muted">@{profile.username}</p>
        </div>
      )}

      <div className="glass-raised elev-1 flex flex-col gap-6 rounded-[22px] p-5">
        <EditDisplayNameForm initialDisplayName={profile?.display_name ?? null} />
        <div className="h-px bg-border" />
        <EditBioForm initialBio={profile?.bio ?? null} />
      </div>
    </PageShell>
  );
}
