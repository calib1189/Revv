"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { INVITE_COOKIE } from "@/lib/invites/tiers";
import { recordInvite } from "@/features/invites/record";
import { markAnnouncementSeen } from "@/lib/db/announcement-views";
import { INVITE_ANNOUNCEMENT } from "@/lib/announcements";

export interface NameInviterState {
  error: string | null;
  inviterUsername: string | null;
}

/** The invite promo showed; never show it to this account again. */
export async function markInvitePromoSeenAction(): Promise<void> {
  try {
    const { supabase, user } = await requireConfirmedUser();
    await markAnnouncementSeen(supabase, user.id, INVITE_ANNOUNCEMENT);
  } catch {
    // Worst case it shows once more on the next launch.
  }
}

/** "Who invited you?" on the welcome screen and the Invite page. */
export async function nameInviterAction(_prev: NameInviterState, formData: FormData): Promise<NameInviterState> {
  try {
    const { supabase, user } = await requireConfirmedUser();
    const result = await recordInvite(supabase, user.id, String(formData.get("inviter") ?? ""), "username");
    if (!result.ok) return { error: result.error, inviterUsername: null };
    (await cookies()).delete(INVITE_COOKIE);
    revalidatePath("/invite");
    revalidatePath("/welcome");
    return { error: null, inviterUsername: result.inviterUsername };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save that. Try again.", inviterUsername: null };
  }
}
