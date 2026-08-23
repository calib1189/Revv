"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { followUser, unfollowUser } from "@/lib/db/follows";
import { updateProfileBio } from "@/lib/db/profiles";
import { blockUser, unblockUser } from "@/lib/db/blocks";
import { validateBio } from "@/lib/validation/profile";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in.");
  return { supabase, user };
}

export async function toggleFollowAction(
  followeeId: string,
  followeeUsername: string,
  isFollowing: boolean,
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (isFollowing) {
    await unfollowUser(supabase, user.id, followeeId);
  } else {
    await followUser(supabase, user.id, followeeId);
  }
  revalidatePath(`/u/${followeeUsername}`);
}

export async function toggleBlockAction(
  targetUserId: string,
  targetUsername: string,
  isBlocking: boolean,
): Promise<void> {
  const { supabase, user } = await requireUser();
  if (isBlocking) {
    await unblockUser(supabase, user.id, targetUserId);
  } else {
    await blockUser(supabase, user.id, targetUserId);
  }
  revalidatePath(`/u/${targetUsername}`);
}

export interface UpdateBioState {
  error: string | null;
}

export async function updateBioAction(
  _prevState: UpdateBioState,
  formData: FormData,
): Promise<UpdateBioState> {
  const bio = String(formData.get("bio") ?? "");
  const error = validateBio(bio);
  if (error) return { error };

  const { supabase, user } = await requireUser();
  const profile = await updateProfileBio(supabase, user.id, bio.trim() || null);
  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/settings/profile");
  return { error: null };
}
