"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { canAddAccount, stashAccount, unstashAccount, type StashedAccount } from "@/lib/auth/account-stash";
import {
  clearActiveSessionCookies,
  readAccountStash,
  resumeStashedAccount,
  revokeStashedAccount,
  writeAccountStash,
} from "@/lib/auth/account-switching";
import { deleteDevicePushToken, registerDevicePushToken } from "@/lib/db/device-push-tokens";
import { isValidDeviceToken } from "@/lib/push/validation";

export interface SwitchAccountResult {
  error?: string;
  /** The account's session ended, so it was removed from the switcher. */
  expired?: boolean;
}

type ServerClient = SupabaseClient<Database>;

/** The active account as a stash entry, ready to set aside. Null when no
 * one is signed in. */
async function activeAccountEntry(supabase: ServerClient): Promise<StashedAccount | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session || session.user.id !== user.id) return null;
  return { id: user.id, refreshToken: session.refresh_token };
}

/**
 * Makes the stashed account `targetId` the active one, setting the
 * current account aside so it can be switched back to.
 *
 * The caller reloads the page afterwards rather than navigating: every
 * screen, cache and the browser's Supabase client still belong to the
 * previous account until it does.
 */
export async function switchAccountAction(targetId: string, pushToken?: string): Promise<SwitchAccountResult> {
  const supabase = await createClient();
  let stash = await readAccountStash();
  const target = stash.find((a) => a.id === targetId);
  if (!target) return { error: "That account isn't signed in on this phone anymore.", expired: true };

  const resumed = await resumeStashedAccount(target);
  if (!resumed.ok) {
    if (resumed.reason === "expired") {
      await writeAccountStash(unstashAccount(stash, targetId));
      return { error: "That account was signed out. Log in to add it again.", expired: true };
    }
    return { error: "Couldn't switch accounts. Check your connection and try again." };
  }

  stash = unstashAccount(stash, targetId);
  const current = await activeAccountEntry(supabase);
  if (current) stash = stashAccount(stash, current);

  const { error } = await supabase.auth.setSession({
    access_token: resumed.session.access_token,
    refresh_token: resumed.session.refresh_token,
  });
  if (error) {
    // Still signed in as before. The target's token was rotated by the
    // resume above, so keep the new one or it can never be switched to.
    await writeAccountStash(
      stashAccount(unstashAccount(stash, current?.id ?? ""), {
        id: targetId,
        refreshToken: resumed.session.refresh_token,
      }),
    );
    return { error: "Couldn't switch accounts. Try again." };
  }
  await writeAccountStash(stash);

  // A phone's push token belongs to one account at a time: notifications
  // follow whichever account is open. Done here, through the resumed
  // session, so it doesn't wait for the next app launch.
  if (isValidDeviceToken(pushToken)) {
    await registerDevicePushToken(resumed.client, pushToken).catch(() => {});
  }
  return {};
}

/** Sets the active account aside and signs this device out of it
 * (without ending its session), so anyone can sign in or sign up as a
 * second account by any method. The caller then opens /login?add=1 with
 * a full page load, for the same reason switchAccountAction's caller
 * reloads. */
export async function addAccountAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const current = await activeAccountEntry(supabase);
  if (!current) return {};
  const stash = await readAccountStash();
  if (!canAddAccount(stash, current.id)) {
    return { error: "You can have up to 5 accounts on one phone. Log out of one to add another." };
  }
  await writeAccountStash(stashAccount(stash, current));
  await clearActiveSessionCookies();
  return {};
}

/** Signs every account on this device out, ending each session on
 * Supabase's side rather than just forgetting it here. */
export async function signOutAllAccountsAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const pushToken = formData.get("pushToken");
  if (isValidDeviceToken(pushToken)) {
    await deleteDevicePushToken(supabase, pushToken).catch(() => {});
  }
  const stash = await readAccountStash();
  await Promise.all(stash.map((account) => revokeStashedAccount(account)));
  await writeAccountStash([]);
  await supabase.auth.signOut();
  redirect("/");
}
