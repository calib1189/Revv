import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listOpenReports } from "@/lib/db/reports";
import { ReportRow } from "@/features/admin/report-row";
import { AdminNav } from "@/features/admin/admin-nav";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/reports");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) redirect("/feed");

  const reports = await listOpenReports(supabase);
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];
  const reporters = await Promise.all(
    reporterIds.map((id) => getProfileByUserId(supabase, id)),
  );
  const usernameById = new Map(
    reporters.filter(Boolean).map((p) => [p!.id, p!.username]),
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reports queue
        </h1>
        <AdminNav current="/admin/reports" />
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted">No open reports.</p>
      ) : (
        <ul>
          {reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              reporterUsername={usernameById.get(report.reporter_id) ?? "unknown"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
