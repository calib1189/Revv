import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/home");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-semibold">
        Welcome{profile ? `, @${profile.username}` : ""}.
      </h1>
      <p className="mt-2 text-muted">
        Your garage and feed will show up here as we build them out.
      </p>
    </div>
  );
}
