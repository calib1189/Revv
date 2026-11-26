"use server";

import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { markAnnouncementSeen } from "@/lib/db/announcement-views";
import { postAnnouncement } from "@/lib/announcements";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A pop-up post showed (or its author just posted it): never show that
 * one to this account again. */
export async function markPostAnnouncementSeenAction(postId: string): Promise<void> {
  if (!UUID.test(postId)) return;
  try {
    const { supabase, user } = await requireConfirmedUser();
    await markAnnouncementSeen(supabase, user.id, postAnnouncement(postId));
  } catch {
    // Worst case it shows once more on the next launch.
  }
}
