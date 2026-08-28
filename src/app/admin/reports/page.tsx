import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listOpenReports, type Report } from "@/lib/db/reports";
import { getPostById } from "@/lib/db/posts";
import { getCommentById } from "@/lib/db/comments";
import { getVehicleById } from "@/lib/db/vehicles";
import { ReportRow } from "@/features/admin/report-row";

/** Resolves whoever actually authored/owns the reported thing — the
 * target_id itself for a 'profile' report, otherwise the author_id/
 * owner_id of the post/comment/vehicle it points at. Null only if the
 * content was already deleted before this report was reviewed. */
async function resolveAuthorId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  report: Report,
): Promise<string | null> {
  if (report.target_type === "profile") return report.target_id;
  if (report.target_type === "post") {
    return (await getPostById(supabase, report.target_id))?.author_id ?? null;
  }
  if (report.target_type === "comment") {
    return (await getCommentById(supabase, report.target_id))?.author_id ?? null;
  }
  return (await getVehicleById(supabase, report.target_id))?.owner_id ?? null;
}

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

  const authorIds = await Promise.all(reports.map((r) => resolveAuthorId(supabase, r)));
  const authorIdByReportId = new Map(reports.map((r, i) => [r.id, authorIds[i]]));

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
              authorId={authorIdByReportId.get(report.id) ?? null}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
