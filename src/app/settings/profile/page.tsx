import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { EditAvatarForm } from "@/features/profile/edit-avatar-form";
import { EditDisplayNameForm } from "@/features/profile/edit-display-name-form";
import { EditBioForm } from "@/features/profile/edit-bio-form";
import Link from "next/link";

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
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link href="/settings" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← Settings
      </Link>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        Edit profile
      </h1>

      {profile && (
        <div className="mb-8">
          <EditAvatarForm
            userId={user.id}
            username={profile.username}
            initialAvatarUrl={avatarUrl}
          />
        </div>
      )}

      <div className="flex flex-col gap-8">
        <EditDisplayNameForm initialDisplayName={profile?.display_name ?? null} />
        <EditBioForm initialBio={profile?.bio ?? null} />
      </div>
    </div>
  );
}
