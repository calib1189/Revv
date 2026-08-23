"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateReportStatus, type Report } from "@/lib/db/reports";
import { deletePost } from "@/lib/db/posts";
import { deleteComment } from "@/lib/db/comments";
import { createAuditLog } from "@/lib/db/audit-logs";

export async function dismissReportAction(reportId: string): Promise<void> {
  const { supabase, userId } = await requireAdmin();
  await updateReportStatus(supabase, reportId, "dismissed");
  await createAuditLog(supabase, {
    actorId: userId,
    action: "report.dismissed",
    targetType: "report",
    targetId: reportId,
  });
  revalidatePath("/admin/reports");
}

export async function removeReportedContentAction(
  reportId: string,
  targetType: Report["target_type"],
  targetId: string,
): Promise<void> {
  const { supabase, userId } = await requireAdmin();

  if (targetType === "post") {
    await deletePost(supabase, targetId);
  } else if (targetType === "comment") {
    await deleteComment(supabase, targetId);
  }
  // profile/vehicle reports: no admin removal action built yet — the
  // report can still be dismissed/resolved below, content just isn't
  // auto-deleted (deliberately out of scope for this slice).

  await updateReportStatus(supabase, reportId, "reviewed");
  await createAuditLog(supabase, {
    actorId: userId,
    action: "report.content_removed",
    targetType,
    targetId,
    metadata: { reportId },
  });
  revalidatePath("/admin/reports");
}
