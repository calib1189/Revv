"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { followUser, unfollowUser } from "@/lib/db/follows";
import {
  updateProfileBio,
  updateProfileDisplayName,
  updateProfileUsername,
  getProfileByUserId,
  getProfileByUsername,
} from "@/lib/db/profiles";
import { blockUser, unblockUser } from "@/lib/db/blocks";
import { validateBio, validateDisplayName } from "@/lib/validation/profile";
import { isPlaceholderUsername, validateUsername } from "@/lib/validation/username";
import { sendPushToUser } from "@/lib/push/send";

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
    after(async () => {
      const actor = await getProfileByUserId(supabase, user.id);
      await sendPushToUser(followeeId, {
        title: "SORZA",
        body: `@${actor?.username ?? "Someone"} started following you`,
        url: `/u/${actor?.username ?? ""}`,
      }, "follows");
    });
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
  revalidatePath("/settings/blocked");
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

export interface ClaimUsernameState {
  error: string | null;
  /** Set once the name is saved. */
  claimed: string | null;
}

/** Google and Apple never ask for a username, so those accounts start
 * as "user_<8 hex chars>" (the auth.users trigger's fallback) and must
 * pick a real one before using the app — see ChooseUsernameScreen. Only
 * works while the account still has that placeholder; changing a chosen
 * name goes through changeUsernameAction in Settings. */
export async function claimUsernameAction(
  _prevState: ClaimUsernameState,
  formData: FormData,
): Promise<ClaimUsernameState> {
  const username = String(formData.get("username") ?? "").trim();
  const error = validateUsername(username);
  if (error) return { error, claimed: null };
  if (isPlaceholderUsername(username)) return { error: "Pick a name of your own.", claimed: null };

  const { supabase, user } = await requireUser();
  const current = await getProfileByUserId(supabase, user.id);
  if (current && !isPlaceholderUsername(current.username)) {
    return { error: null, claimed: current.username };
  }
  const existing = await getProfileByUsername(supabase, username);
  if (existing && existing.id !== user.id) return { error: "That username is taken.", claimed: null };

  try {
    await updateProfileUsername(supabase, user.id, username);
  } catch (err) {
    const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? "");
    if (message.toLowerCase().includes("duplicate")) return { error: "That username is taken.", claimed: null };
    return { error: "Couldn't save that username. Try again.", claimed: null };
  }
  revalidatePath("/", "layout");
  return { error: null, claimed: username };
}

export interface ChangeUsernameState {
  error: string | null;
  /** Set once a change has gone through — the new username. */
  changedTo: string | null;
}

export interface UsernameAvailability {
  /** null while the name itself isn't valid — see `error`. */
  available: boolean | null;
  error?: string;
}

/** The live "is this free?" check under the username field. The format
 * rules come first, so a name that could never be saved isn't reported
 * as available. Your own current name counts as yours, not taken. */
export async function checkUsernameAvailabilityAction(raw: string): Promise<UsernameAvailability> {
  const username = raw.trim();
  const error = validateUsername(username);
  if (error) return { available: null, error };

  const { supabase, user } = await requireUser();
  const existing = await getProfileByUsername(supabase, username);
  return { available: !existing || existing.id === user.id };
}

/** Changes the signed-in person's @username from Settings → Edit Profile.
 * Checked again here, not just trusted from the live check: someone else
 * can take the name between the check and the tap. The unique constraint
 * on profiles.username is the final word either way. */
export async function changeUsernameAction(
  _prevState: ChangeUsernameState,
  formData: FormData,
): Promise<ChangeUsernameState> {
  const username = String(formData.get("username") ?? "").trim();
  const error = validateUsername(username);
  if (error) return { error, changedTo: null };

  const { supabase, user } = await requireUser();
  const current = await getProfileByUserId(supabase, user.id);
  if (current?.username === username) return { error: "That's already your username.", changedTo: null };

  const existing = await getProfileByUsername(supabase, username);
  if (existing && existing.id !== user.id) return { error: "That username is taken.", changedTo: null };

  try {
    await updateProfileUsername(supabase, user.id, username);
  } catch (err) {
    const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? "");
    if (message.toLowerCase().includes("duplicate")) return { error: "That username is taken.", changedTo: null };
    return { error: "Couldn't change your username. Try again.", changedTo: null };
  }

  if (current) revalidatePath(`/u/${current.username}`);
  revalidatePath(`/u/${username}`);
  revalidatePath("/settings/profile");
  revalidatePath("/settings");
  return { error: null, changedTo: username };
}

export interface UpdateDisplayNameState {
  error: string | null;
}

export async function updateDisplayNameAction(
  _prevState: UpdateDisplayNameState,
  formData: FormData,
): Promise<UpdateDisplayNameState> {
  const displayName = String(formData.get("displayName") ?? "");
  const error = validateDisplayName(displayName);
  if (error) return { error };

  const { supabase, user } = await requireUser();
  const profile = await updateProfileDisplayName(supabase, user.id, displayName.trim() || null);
  revalidatePath(`/u/${profile.username}`);
  revalidatePath("/settings/profile");
  return { error: null };
}
