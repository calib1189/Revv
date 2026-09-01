import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { ComposePostForm } from "@/features/feed/compose-post-form";

export default async function NewPostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/feed/new");

  const supabase = await createClient();

  // RLS already blocks this account's post inserts outright (migration
  // 0055) — checked again here so a banned user sees why up front,
  // rather than filling out an entire post only to have the final save
  // fail with no useful explanation.
  const profile = await getProfileByUserId(supabase, user.id);
  if (profile?.is_banned) {
    return (
      <div className="mx-auto max-w-md flex-1 px-4 py-16 text-center">
        <p className="text-lg font-semibold">Your account is restricted</p>
        <p className="mt-2 text-sm text-muted">
          You can&apos;t create new posts right now. Contact support if you think this is a
          mistake.
        </p>
      </div>
    );
  }

  const vehicles = await listVehiclesByOwner(supabase, user.id);

  return <ComposePostForm userId={user.id} vehicles={vehicles} />;
}
