"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateReportStatus, type Report } from "@/lib/db/reports";
import { deletePost } from "@/lib/db/posts";
import { deleteComment } from "@/lib/db/comments";
import { deleteVehicle, updateVehicle } from "@/lib/db/vehicles";
import { setUserBanned, setUserVerified, setUserFounder } from "@/lib/db/profiles";
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
  } else if (targetType === "vehicle") {
    await deleteVehicle(supabase, targetId);
  }
  // profile reports: no admin removal action built yet — the report can
  // still be dismissed/resolved below, content just isn't auto-deleted
  // (deliberately out of scope for this slice).

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

/** Blocks the account from creating new posts/comments (enforced at the
 * RLS layer, see 0055_user_bans.sql) — doesn't touch login or delete
 * anything already posted. Meant to be paired with
 * removeReportedContentAction when a report is actually serious, not a
 * replacement for it. */
export async function banUserAction(userId: string): Promise<void> {
  const { supabase, userId: actorId } = await requireAdmin();
  await setUserBanned(supabase, userId, true);
  await createAuditLog(supabase, {
    actorId,
    action: "user.banned",
    targetType: "profile",
    targetId: userId,
  });
  revalidatePath("/admin/reports");
}

export async function unbanUserAction(userId: string): Promise<void> {
  const { supabase, userId: actorId } = await requireAdmin();
  await setUserBanned(supabase, userId, false);
  await createAuditLog(supabase, {
    actorId,
    action: "user.unbanned",
    targetType: "profile",
    targetId: userId,
  });
  revalidatePath("/admin/reports");
}

/** Grants/revokes the "Verified" checkmark — the account-level SORZA
 * badge (0038), distinct from parts.verified or vehicle ownership
 * verification. No self-service path exists for this at all; it's only
 * ever reachable through this admin action. */
export async function setUserVerifiedAction(userId: string, verified: boolean): Promise<void> {
  const { supabase, userId: actorId } = await requireAdmin();
  await setUserVerified(supabase, userId, verified);
  await createAuditLog(supabase, {
    actorId,
    action: verified ? "user.verified" : "user.unverified",
    targetType: "profile",
    targetId: userId,
  });
  revalidatePath("/admin/users");
}

/** Grants/revokes the "Founder & Owner" title (0063). By convention a
 * single-account badge — nothing in the schema enforces that, this admin
 * UI is what does. */
export async function setUserFounderAction(userId: string, isFounder: boolean): Promise<void> {
  const { supabase, userId: actorId } = await requireAdmin();
  await setUserFounder(supabase, userId, isFounder);
  await createAuditLog(supabase, {
    actorId,
    action: isFounder ? "user.founder_granted" : "user.founder_revoked",
    targetType: "profile",
    targetId: userId,
  });
  revalidatePath("/admin/users");
}

export async function setOwnershipVerificationStatusAction(
  vehicleId: string,
  status: "approved" | "rejected",
): Promise<void> {
  const { supabase, userId } = await requireAdmin();
  await updateVehicle(supabase, vehicleId, { ownership_verification_status: status });
  await createAuditLog(supabase, {
    actorId: userId,
    action: status === "approved" ? "vehicle.verification_approved" : "vehicle.verification_rejected",
    targetType: "vehicle",
    targetId: vehicleId,
  });
  revalidatePath("/admin/verifications");
  revalidatePath("/leaderboard");
}
