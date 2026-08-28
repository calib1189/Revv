import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listOpenReports } from "@/lib/db/reports";
import { ReportRow } from "@/features/admin/report-row";

export default async function AdminReportsPage() {
  const supabase = await createClient();
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
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Reports queue</h1>

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
