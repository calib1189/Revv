import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getAdminQueueCounts } from "@/lib/admin/queue-counts";
import { AdminChrome } from "@/features/admin/admin-chrome";

/** Single admin auth gate + persistent navigation for every /admin/*
 * route — one place that decides who gets in, and one shared count of
 * what's waiting in each review queue. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) redirect("/feed");

  const counts = await getAdminQueueCounts(supabase);

  return <AdminChrome counts={counts}>{children}</AdminChrome>;
}
