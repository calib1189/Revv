import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type AdCampaign = Database["public"]["Tables"]["ad_campaigns"]["Row"];
export type AdCampaignInsert = Database["public"]["Tables"]["ad_campaigns"]["Insert"];
export type AdTier = AdCampaign["tier"];

/** The only prices/durations that exist — looked up server-side by tier
 * key, never trusted from the client, so a submitted price can't be
 * tampered with in the request. Money is integer cents, per every other
 * price in this app. Labels match the Silver/Gold/Diamond branding used
 * across every paid tier in the app — see components/ui/tier-picker.tsx. */
export const AD_TIERS: Record<AdTier, { label: string; priceCents: number; durationDays: number }> = {
  starter: { label: "Silver", priceCents: 2500, durationDays: 3 },
  standard: { label: "Gold", priceCents: 7500, durationDays: 7 },
  featured: { label: "Diamond", priceCents: 20000, durationDays: 14 },
};

export function isAdTier(value: string): value is AdTier {
  return value in AD_TIERS;
}

export async function createAdCampaign(
  supabase: SupabaseClient<Database>,
  input: AdCampaignInsert,
): Promise<AdCampaign> {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getAdCampaignById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<AdCampaign | null> {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listCampaignsByAdvertiser(
  supabase: SupabaseClient<Database>,
  advertiserId: string,
): Promise<AdCampaign[]> {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("advertiser_id", advertiserId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/** The admin review queue's source list. */
export async function listPendingReviewCampaigns(
  supabase: SupabaseClient<Database>,
): Promise<AdCampaign[]> {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

/** Currently in-flight campaigns (approved and within their paid date
 * range) — the feed's actual injection pool. Filtering ends_at here
 * rather than relying on some background job to flip status to 'ended'
 * means a campaign that's simply past its paid window stops showing
 * immediately, with no cron/scheduled task required to keep it honest. */
export async function listActiveCampaigns(
  supabase: SupabaseClient<Database>,
): Promise<AdCampaign[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .eq("status", "active")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso);

  if (error) throw error;
  return data;
}

export async function updateAdCampaignStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  fields: Pick<Database["public"]["Tables"]["ad_campaigns"]["Update"], "status" | "starts_at" | "ends_at">,
): Promise<void> {
  const { error } = await supabase.from("ad_campaigns").update(fields).eq("id", id);
  if (error) throw error;
}

export async function recordAdEvent(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  kind: "impression" | "click",
  viewerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("ad_events")
    .insert({ campaign_id: campaignId, kind, viewer_id: viewerId });
  if (error) throw error;
}

export async function getEventCountsForCampaign(
  supabase: SupabaseClient<Database>,
  campaignId: string,
): Promise<{ impressions: number; clicks: number }> {
  const { data, error } = await supabase
    .from("ad_events")
    .select("kind")
    .eq("campaign_id", campaignId);

  if (error) throw error;
  return {
    impressions: data.filter((e) => e.kind === "impression").length,
    clicks: data.filter((e) => e.kind === "click").length,
  };
}
