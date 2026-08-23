import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { ComposePostForm } from "@/features/feed/compose-post-form";

export default async function NewPostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/feed/new");

  const supabase = await createClient();
  const vehicles = await listVehiclesByOwner(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        New post
      </h1>
      <ComposePostForm userId={user.id} vehicles={vehicles} />
    </div>
  );
}
