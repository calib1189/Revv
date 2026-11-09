"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { updateReportStatus, type Report } from "@/lib/db/reports";
import { deletePost } from "@/lib/db/posts";
import { deleteComment } from "@/lib/db/comments";
import { deleteVehicle, updateVehicle, type Vehicle } from "@/lib/db/vehicles";
import { getActiveBuild } from "@/lib/db/builds";
import { normalizeRejectionReason, rejectionPushBody } from "@/lib/validation/rejection-reason";
import { deleteShopReview } from "@/lib/db/shop-reviews";
import { deleteDailySubmission } from "@/lib/db/daily";
import { setUserBanned, setUserVerified, setUserFounder } from "@/lib/db/profiles";
import { updateBusinessProfile } from "@/lib/db/business-profiles";
import { createAuditLog } from "@/lib/db/audit-logs";
import { sendPushToUser } from "@/lib/push/send";

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
  } else if (targetType === "shop_review") {
    await deleteShopReview(supabase, targetId);
  } else if (targetType === "daily_submission") {
    await deleteDailySubmission(supabase, targetId);
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

/** Approve or reject a new car for the leaderboard. A rejection can carry
 * a message for the owner: it's sent in the push and shown on their car
 * page, where a new cover photo sends the car back for review (0108).
 * Approving clears any old message. */
export async function setOwnershipVerificationStatusAction(
  vehicleId: string,
  status: "approved" | "rejected",
  rawReason?: string | null,
): Promise<{ error: string | null }> {
  const { supabase, userId } = await requireAdmin();
  const { reason, error: reasonError } = normalizeRejectionReason(status === "rejected" ? rawReason : null);
  if (reasonError) return { error: reasonError };

  // updateVehicle returns the full row, so no separate fetch is needed
  // to get owner_id/nickname/make/model for the push below.
  let vehicle: Vehicle;
  try {
    vehicle = await updateVehicle(supabase, vehicleId, {
      ownership_verification_status: status,
      ownership_rejection_reason: reason,
    });
  } catch (err) {
    // Migration 0108 not applied yet: still approve or reject, just
    // without storing the message (the push below still carries it).
    if (!isMissingColumnError(err)) throw err;
    vehicle = await updateVehicle(supabase, vehicleId, { ownership_verification_status: status });
  }
  await createAuditLog(supabase, {
    actorId: userId,
    action: status === "approved" ? "vehicle.verification_approved" : "vehicle.verification_rejected",
    targetType: "vehicle",
    targetId: vehicleId,
    ...(reason ? { metadata: { reason } } : {}),
  });
  revalidatePath("/admin/verifications");
  revalidatePath("/leaderboard");
  revalidatePath(`/garage/${vehicleId}`);

  const name = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;
  if (status === "approved") {
    const build = await getActiveBuild(supabase, vehicleId);
    const rated = build?.ai_rating_score != null;
    await sendPushToUser(vehicle.owner_id, {
      title: "SORZA",
      body: rated
        ? `${name} is approved and on the leaderboard`
        : `${name} is approved. Rate it to get on the leaderboard`,
      url: `/garage/${vehicleId}`,
    }, "updates");
  } else {
    await sendPushToUser(vehicle.owner_id, {
      title: "SORZA",
      body: rejectionPushBody(name, reason),
      url: `/garage/${vehicleId}`,
    }, "updates");
  }
  return { error: null };
}

/** PostgREST's "that column doesn't exist" (schema cache or Postgres). */
function isMissingColumnError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return e?.code === "PGRST204" || e?.code === "42703" || /ownership_rejection_reason/.test(e?.message ?? "");
}

export async function setBusinessVerificationStatusAction(
  businessProfileId: string,
  status: "approved" | "rejected",
): Promise<void> {
  const { supabase, userId } = await requireAdmin();
  await updateBusinessProfile(supabase, businessProfileId, { verification_status: status });
  await createAuditLog(supabase, {
    actorId: userId,
    action: status === "approved" ? "business_profile.verification_approved" : "business_profile.verification_rejected",
    targetType: "business_profile",
    targetId: businessProfileId,
  });
  revalidatePath("/admin/business-verifications");
  revalidatePath("/discover");
}
