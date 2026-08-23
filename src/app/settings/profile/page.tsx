import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { EditBioForm } from "@/features/profile/edit-bio-form";
import { DeleteAccountButton } from "@/features/auth/delete-account-button";
import Link from "next/link";

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

      <div className="mt-8 border-t border-border pt-6">
        <Link href="/settings/billing" className="text-sm text-accent hover:underline">
          Billing
        </Link>
      </div>

      {profile && (
        <div className="mt-8 border-t border-border pt-6">
          <DeleteAccountButton username={profile.username} />
        </div>
      )}
    </div>
  );
}
