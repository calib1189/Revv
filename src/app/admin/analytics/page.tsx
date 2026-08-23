import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getPlatformTotals, getEventCounts } from "@/lib/analytics/queries";
import { AdminNav } from "@/features/admin/admin-nav";

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/analytics");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) redirect("/feed");

  const [totals, eventCounts] = await Promise.all([
    getPlatformTotals(supabase),
    getEventCounts(supabase, 30),
  ]);

  const maxCount = Math.max(1, ...eventCounts.map((e) => e.count));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <AdminNav current="/admin/analytics" />
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{totals.profiles}</p>
          <p className="text-xs text-muted">Users</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{totals.vehicles}</p>
          <p className="text-xs text-muted">Vehicles</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{totals.posts}</p>
          <p className="text-xs text-muted">Posts</p>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Events (last 30 days)</h2>
      {eventCounts.length === 0 ? (
        <p className="text-sm text-muted">No events recorded yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {eventCounts.map((event) => (
            <div key={event.name}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{event.name}</span>
                <span className="text-muted">{event.count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(event.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
