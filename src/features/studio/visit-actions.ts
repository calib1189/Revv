"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { recordProfileVisit } from "@/lib/db/profile-visits";
import { recordVehicleView } from "@/lib/db/vehicle-views";
import { getVehicleById } from "@/lib/db/vehicles";
import { isUuid } from "@/lib/validation/uuid";

/** Counts a visit to a profile or garage that came from a post (the
 * ?from= link), for that post's Creator Studio stats. Called by the page
 * once it's actually on screen (RecordVisit), not while the server draws
 * it: the app preloads pages it expects you to open, and a preload must
 * never count as a visit. Best-effort; never revalidates, so it never
 * makes the page re-render. Logged-out viewers and owners aren't counted. */
export async function recordPostVisitAction(input: {
  kind: "profile" | "vehicle";
  targetId: string;
  sourcePostId: string;
}): Promise<void> {
  if (input.kind !== "profile" && input.kind !== "vehicle") return;
  if (!isUuid(input.targetId) || !isUuid(input.sourcePostId)) return;
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const supabase = await createClient();
    if (input.kind === "profile") {
      if (input.targetId === user.id) return;
      await recordProfileVisit(supabase, user.id, input.targetId, input.sourcePostId);
    } else {
      const vehicle = await getVehicleById(supabase, input.targetId);
      if (!vehicle || vehicle.owner_id === user.id) return;
      await recordVehicleView(supabase, user.id, input.targetId, input.sourcePostId);
    }
  } catch {
    // A missed visit only costs a stat.
  }
}
