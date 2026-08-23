import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { EditBioForm } from "@/features/profile/edit-bio-form";

export default async function EditProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/profile");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        Edit profile
      </h1>
      <EditBioForm initialBio={profile?.bio ?? null} />
    </div>
  );
}
