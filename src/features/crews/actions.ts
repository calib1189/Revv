"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { validateCrewForm } from "@/lib/validation/crew";
import { isCrewCategory } from "@/lib/crews/category";
import { createCrew, updateCrew, deleteCrew, getCrewById } from "@/lib/db/crews";
import {
  joinCrew,
  requestToJoinCrew,
  leaveCrew,
  approveJoinRequest,
  rejectJoinRequest,
  updateMemberRole,
  removeMember,
  getCrewMemberRole,
  getCrewMemberById,
  listCrewMembers,
  type CrewMemberRole,
} from "@/lib/db/crew-members";
import { trackEvent } from "@/lib/analytics/track";
import { getStoreItem, type StoreCategory } from "@/lib/store/catalog";
import { listOwnedItemIds } from "@/lib/db/points";
import { getProfileByUserId } from "@/lib/db/profiles";
import { sendPushToUser } from "@/lib/push/send";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CrewInsert } from "@/lib/db/crews";

export interface CrewFormState {
  error: string | null;
}

export interface StoreActionState {
  error: string | null;
}

function readCrewFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? ""),
    locationText: String(formData.get("locationText") ?? ""),
    visibility: String(formData.get("visibility") ?? "public"),
  };
}

function toCrewInput(fields: ReturnType<typeof readCrewFields>): Omit<CrewInsert, "owner_id"> {
  return {
    name: fields.name.trim(),
    description: fields.description.trim() || null,
    category: isCrewCategory(fields.category) ? fields.category : "other",
    location_text: fields.locationText.trim() || null,
    visibility: fields.visibility === "private" ? "private" : "public",
  };
}

export async function createCrewAction(
  _prevState: CrewFormState,
  formData: FormData,
): Promise<CrewFormState> {
  const fields = readCrewFields(formData);
  const errors = validateCrewForm(fields);
  const firstError = Object.values(errors)[0];
  if (firstError) return { error: firstError };

  const { supabase, user } = await requireConfirmedUser();

  const crew = await createCrew(supabase, { ...toCrewInput(fields), owner_id: user.id });
  await trackEvent(supabase, user.id, "crew_created", { crew_id: crew.id });

  redirect(`/crews/${crew.id}`);
}

export async function updateCrewAction(
  crewId: string,
  _prevState: CrewFormState,
  formData: FormData,
): Promise<CrewFormState> {
  const fields = readCrewFields(formData);
  const errors = validateCrewForm(fields);
  const firstError = Object.values(errors)[0];
  if (firstError) return { error: firstError };

  const { supabase } = await requireConfirmedUser();
  await updateCrew(supabase, crewId, toCrewInput(fields));

  revalidatePath(`/crews/${crewId}`);
  redirect(`/crews/${crewId}`);
}

export async function deleteCrewAction(crewId: string): Promise<void> {
  const { supabase } = await requireConfirmedUser();
  await deleteCrew(supabase, crewId);
  revalidatePath("/crews");
  redirect("/crews");
}

/** Joins instantly for a public crew, or files a request for a private
 * one — the caller (JoinButton) doesn't need to know which happened,
 * only that the button should now read Leave or Pending. */
export async function joinCrewAction(crewId: string): Promise<void> {
  const { supabase, user } = await requireConfirmedUser();
  const crew = await getCrewById(supabase, crewId);
  if (!crew) throw new Error("Couldn't find that crew.");

  if (crew.visibility === "public") {
    await joinCrew(supabase, crewId, user.id);
  } else {
    await requestToJoinCrew(supabase, crewId, user.id);
    after(() => notifyCrewLeadersOfJoinRequest(supabase, crewId, crew.name, user.id));
  }
  revalidatePath(`/crews/${crewId}`);
}

/** Fire-and-forget push to every leader/admin of a crew when someone
 * requests to join it — the push counterpart to
 * handle_new_crew_join_request (0065), which already creates the in-app
 * row for the same set of people. */
async function notifyCrewLeadersOfJoinRequest(
  supabase: SupabaseClient<Database>,
  crewId: string,
  crewName: string,
  actorId: string,
): Promise<void> {
  try {
    const members = await listCrewMembers(supabase, crewId);
    const leaders = members.filter(
      (m) => (m.role === "leader" || m.role === "admin") && m.user_id !== actorId,
    );
    if (leaders.length === 0) return;
    const actor = await getProfileByUserId(supabase, actorId);
    await Promise.all(
      leaders.map((l) =>
        sendPushToUser(l.user_id, {
          title: "SORZA",
          body: `@${actor?.username ?? "Someone"} requested to join ${crewName}`,
          url: `/crews/${crewId}/requests`,
        }),
      ),
    );
  } catch {
    // best-effort only
  }
}

/** Fire-and-forget push to every OTHER approved member of a crew when
 * someone posts to it — the push counterpart to handle_new_crew_post
 * (0065). Called directly by the client after a crew-tagged post is
 * created there (compose-post-form.tsx creates the post row itself, not
 * through a Server Action — see that file's own comment on why), rather
 * than through a database trigger, since only application code can call
 * a push provider. */
export async function notifyCrewPostAction(crewId: string, postId: string): Promise<void> {
  const { supabase, user } = await requireConfirmedUser();
  try {
    const [members, actor] = await Promise.all([
      listCrewMembers(supabase, crewId),
      getProfileByUserId(supabase, user.id),
    ]);
    await Promise.all(
      members
        .filter((m) => m.user_id !== user.id)
        .map((m) =>
          sendPushToUser(m.user_id, {
            title: "SORZA",
            body: `@${actor?.username ?? "Someone"} posted in a crew you're in`,
            url: `/p/${postId}`,
          }),
        ),
    );
  } catch {
    // best-effort only — never surfaced to the poster, who has already
    // seen their post publish successfully regardless of this.
  }
}

/** Also doubles as "cancel my pending request" — both are just deleting
 * your own crew_members row, regardless of its current status. Blocks
 * the crew's owner specifically, since there's no ownership-transfer
 * flow in v1 — a crew must always keep its creator as a member. */
export async function leaveCrewAction(crewId: string): Promise<void> {
  const { supabase, user } = await requireConfirmedUser();
  const crew = await getCrewById(supabase, crewId);
  if (!crew) throw new Error("Couldn't find that crew.");
  if (crew.owner_id === user.id) {
    throw new Error("The crew's owner can't leave it.");
  }

  await leaveCrew(supabase, crewId, user.id);
  revalidatePath(`/crews/${crewId}`);
}

export async function approveJoinRequestAction(crewMemberId: string, crewId: string): Promise<void> {
  const { supabase } = await requireConfirmedUser();
  // Fetched before approving — the id alone isn't enough to push to the
  // right person once the row itself no longer distinguishes "pending".
  const member = await getCrewMemberById(supabase, crewMemberId);
  await approveJoinRequest(supabase, crewMemberId);
  revalidatePath(`/crews/${crewId}/requests`);
  revalidatePath(`/crews/${crewId}`);
  if (member) {
    after(() => notifyApprovedCrewMember(supabase, member.user_id, crewId));
  }
}

async function notifyApprovedCrewMember(
  supabase: SupabaseClient<Database>,
  userId: string,
  crewId: string,
): Promise<void> {
  try {
    const crew = await getCrewById(supabase, crewId);
    await sendPushToUser(userId, {
      title: "SORZA",
      body: `You're in — your request to join ${crew?.name ?? "the crew"} was approved`,
      url: `/crews/${crewId}`,
    });
  } catch {
    // best-effort only
  }
}

export async function rejectJoinRequestAction(crewMemberId: string, crewId: string): Promise<void> {
  const { supabase } = await requireConfirmedUser();
  await rejectJoinRequest(supabase, crewMemberId);
  revalidatePath(`/crews/${crewId}/requests`);
}

/** RLS lets any approved leader OR admin update any member row in their
 * crew, but promoting someone to (or demoting someone from) 'leader'
 * specifically should require the acting user to already be a leader
 * themselves, not just an admin — enforced here at the app level since
 * RLS's own check is deliberately coarser (see 0064_crews.sql). */
export async function updateMemberRoleAction(
  crewMemberId: string,
  crewId: string,
  role: CrewMemberRole,
  targetCurrentRole: CrewMemberRole,
): Promise<void> {
  const { supabase, user } = await requireConfirmedUser();

  if (role === "leader" || targetCurrentRole === "leader") {
    const actingRole = await getCrewMemberRole(supabase, crewId, user.id);
    if (actingRole !== "leader") {
      throw new Error("Only a crew leader can promote or demote a leader.");
    }
  }

  await updateMemberRole(supabase, crewMemberId, role);
  revalidatePath(`/crews/${crewId}`);
}

/** Blocks removing the crew's owner — same "no ownership transfer in v1"
 * guard as leaveCrewAction, from the other direction. */
export async function removeMemberAction(
  crewMemberId: string,
  crewId: string,
  targetUserId: string,
): Promise<void> {
  const { supabase } = await requireConfirmedUser();
  const crew = await getCrewById(supabase, crewId);
  if (!crew) throw new Error("Couldn't find that crew.");
  if (crew.owner_id === targetUserId) {
    throw new Error("The crew's owner can't be removed.");
  }

  await removeMember(supabase, crewMemberId);
  revalidatePath(`/crews/${crewId}`);
}

/** Cosmetics equip onto the crew itself (shared, not per-viewer) but
 * are still bought from the acting user's own points/ownership — same
 * "server looks up the real price/ownership, never trusts the client"
 * rule as purchaseItemAction. Ownership of the crew is enforced by RLS
 * on the crews UPDATE below ("owners manage their own crews",
 * 0064_crews.sql), same convention updateCrewAction already relies on
 * — a non-owner's call here silently updates zero rows rather than
 * throwing. Signature matches equipItemAction's (category: StoreCategory)
 * once bound with crewId, so both can share the same generic
 * store-page-content.tsx equipAction prop. */
export async function equipCrewItemAction(
  crewId: string,
  category: StoreCategory,
  itemId: string | null,
): Promise<StoreActionState> {
  if (category !== "crew_name_color" && category !== "crew_banner" && category !== "crew_frame") {
    return { error: "Invalid item." };
  }

  const { supabase, user } = await requireConfirmedUser();

  if (itemId) {
    const item = getStoreItem(itemId);
    if (!item || item.category !== category) return { error: "Invalid item." };

    if (item.founderOnly) {
      const profile = await getProfileByUserId(supabase, user.id);
      if (!profile?.is_founder) return { error: "That item isn't available." };
    }

    const owned = await listOwnedItemIds(supabase, user.id);
    if (!owned.has(itemId)) return { error: "You don't own this item." };
  }

  const patch =
    category === "crew_name_color"
      ? { equipped_crew_name_color: itemId }
      : category === "crew_banner"
        ? { equipped_crew_banner: itemId }
        : { equipped_crew_frame: itemId };

  try {
    await updateCrew(supabase, crewId, patch);
    revalidatePath(`/crews/${crewId}`);
  } catch (err) {
    console.error("equipCrewItemAction failed:", err);
    return { error: "Couldn't update the crew's equipped item. Try again." };
  }

  return { error: null };
}
