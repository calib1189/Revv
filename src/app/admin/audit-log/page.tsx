import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listAuditLogs } from "@/lib/db/audit-logs";
import { relativeTime } from "@/lib/format/relative-time";
import { AdminNav } from "@/features/admin/admin-nav";

export default async function AuditLogPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/audit-log");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) redirect("/feed");

  const logs = await listAuditLogs(supabase);
  const actorIds = [...new Set(logs.map((l) => l.actor_id).filter((id): id is string => Boolean(id)))];
  const actors = await Promise.all(
    actorIds.map((id) => getProfileByUserId(supabase, id)),
  );
  const usernameById = new Map(
    actors.filter(Boolean).map((p) => [p!.id, p!.username]),
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <AdminNav current="/admin/audit-log" />
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted">No admin actions recorded yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
          {logs.map((log) => (
            <li key={log.id} className="px-4 py-3 text-sm">
              <span className="font-medium">
                @{log.actor_id ? (usernameById.get(log.actor_id) ?? "unknown") : "system"}
              </span>{" "}
              <span className="text-muted">{log.action}</span>
              {log.target_type && (
                <span className="text-muted"> · {log.target_type}</span>
              )}
              <span className="ml-2 text-xs text-muted">
                {relativeTime(log.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
