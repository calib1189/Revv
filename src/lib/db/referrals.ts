import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Referral = Database["public"]["Tables"]["referrals"]["Row"];

/** Who invited this person, if anyone has been recorded. */
export async function getReferralForInvitee(
  supabase: SupabaseClient<Database>,
  inviteeId: string,
): Promise<Referral | null> {
  const { data, error } = await supabase.from("referrals").select("*").eq("invitee_id", inviteeId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Everyone this person invited, newest first. */
export async function listReferralsByReferrer(
  supabase: SupabaseClient<Database>,
  referrerId: string,
): Promise<Referral[]> {
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", referrerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Records who invited someone. Returns false when they already had an
 * inviter (the primary key on invitee_id), so a second attempt is a no-op
 * rather than an error. */
export async function insertReferral(
  supabase: SupabaseClient<Database>,
  row: { invitee_id: string; referrer_id: string; source: Referral["source"] },
): Promise<boolean> {
  const { error } = await supabase.from("referrals").insert(row);
  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

/** Every invite, newest first, for the admin Invites page (admins only,
 * by RLS). */
export async function listAllReferrals(supabase: SupabaseClient<Database>, limit = 5000): Promise<Referral[]> {
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Which of these people have added at least one car: the line between
 * an invite that counts and one that doesn't. */
export async function listOwnersWithCars(
  supabase: SupabaseClient<Database>,
  ownerIds: string[],
): Promise<Set<string>> {
  if (ownerIds.length === 0) return new Set();
  const owners = new Set<string>();
  // Chunked so a big inviter's list stays inside the URL length limit.
  for (let i = 0; i < ownerIds.length; i += 200) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("owner_id")
      .in("owner_id", ownerIds.slice(i, i + 200));
    if (error) throw error;
    for (const row of data) owners.add(row.owner_id);
  }
  return owners;
}
