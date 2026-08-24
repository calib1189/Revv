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

  return <ComposePostForm userId={user.id} vehicles={vehicles} />;
}
