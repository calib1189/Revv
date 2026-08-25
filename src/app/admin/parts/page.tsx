import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listAllParts } from "@/lib/db/parts";
import { AdminNav } from "@/features/admin/admin-nav";
import { AdminPartsClient } from "@/features/admin/admin-parts-client";

export default async function AdminPartsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/parts");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) redirect("/feed");

  const parts = await listAllParts(supabase);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Parts catalog</h1>
        <AdminNav current="/admin/parts" />
      </div>
      <AdminPartsClient parts={parts} />
    </div>
  );
}
