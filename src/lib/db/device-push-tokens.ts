import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isValidDeviceToken } from "@/lib/push/validation";

export type DevicePushToken = Database["public"]["Tables"]["device_push_tokens"]["Row"];

/** Attaches `token` to the signed-in user, taking it over from whoever had
 * it before if the phone changed hands. Goes through a database function
 * rather than an upsert on purpose — see 0091_device_push_tokens.sql for
 * why a plain upsert silently fails in exactly that situation. */
export async function registerDevicePushToken(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<void> {
  if (!isValidDeviceToken(token)) throw new Error("Invalid device token.");
  // Cast, not a typed Functions entry. supabase-js resolves an embedded
  // join like media(*) by also searching Database.Functions, so giving
  // that map real members changes inference for every join in the app
  // (post_media, meetup_media, business_profile_media all stopped
  // typechecking). The map stays Record<string, never> and this one call
  // is cast instead. Args are still validated above.
  const { error } = await supabase.rpc("register_device_push_token", {
    p_token: token,
    p_platform: "ios",
  } as never);
  if (error) throw error;
}

/** Removes one of the signed-in user's tokens. RLS scopes this to their
 * own rows, so passing someone else's token deletes nothing. */
export async function deleteDevicePushToken(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<void> {
  const { error } = await supabase.from("device_push_tokens").delete().eq("token", token);
  if (error) throw error;
}

export async function hasDevicePushToken(
  supabase: SupabaseClient<Database>,
  userId: string,
  token: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("device_push_tokens")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("token", token);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Server-only, with the service-role client: sending a push means
 * reading tokens that belong to someone other than the caller. */
export async function listDevicePushTokensForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("device_push_tokens")
    .select("token")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.token);
}

/** Server-only. Called with exactly the tokens the push service reported
 * as permanently dead. */
export async function deleteDevicePushTokens(
  supabase: SupabaseClient<Database>,
  tokens: string[],
): Promise<void> {
  if (tokens.length === 0) return;
  const { error } = await supabase.from("device_push_tokens").delete().in("token", tokens);
  if (error) throw error;
}
