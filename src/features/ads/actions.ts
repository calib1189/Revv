"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isAdBillingConfigured } from "@/lib/billing/config";
import { createAdCheckoutSession } from "@/lib/billing/stripe";
import {
  createAdCampaign,
  getAdCampaignById,
  updateAdCampaignStatus,
  recordAdEvent,
  AD_TIERS,
  isAdTier,
} from "@/lib/db/ad-campaigns";
import { createAuditLog } from "@/lib/db/audit-logs";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateAdResult {
  error?: string;
}

export async function createAdCampaignAction({
  mediaId,
  headline,
  caption,
  destinationUrl,
  tier,
}: {
  mediaId: string;
  headline: string;
  caption: string;
  destinationUrl: string;
  tier: string;
}): Promise<CreateAdResult> {
  if (!isAdBillingConfigured()) {
    return { error: "Ad billing isn't set up yet." };
  }
  if (!isAdTier(tier)) {
    return { error: "Choose a valid tier." };
  }
  if (!headline.trim()) {
    return { error: "Headline is required." };
  }
  let destination: URL;
  try {
    destination = new URL(destinationUrl);
    if (destination.protocol !== "https:" && destination.protocol !== "http:") {
      throw new Error("bad protocol");
    }
  } catch {
    return { error: "Enter a valid destination URL (starting with https://)." };
  }

  const { supabase, user } = await requireUser();
  if (!user.email) return { error: "Your account needs a confirmed email." };

  // Price/duration come from AD_TIERS (server-side, keyed by the tier
  // name) — never from anything the client sent, so a tampered request
  // can't submit its own cheaper price.
  const { priceCents, durationDays } = AD_TIERS[tier];

  let campaign;
  try {
    campaign = await createAdCampaign(supabase, {
      advertiser_id: user.id,
      headline: headline.trim(),
      caption: caption.trim() || null,
      media_id: mediaId,
      destination_url: destination.toString(),
      tier,
      price_cents: priceCents,
      duration_days: durationDays,
      status: "pending_payment",
    });
  } catch {
    return { error: "Couldn't create the campaign. Try again." };
  }

  const origin = (await headers()).get("origin");
  let url: string | null;
  try {
    const session = await createAdCheckoutSession({
      campaignId: campaign.id,
      headline: campaign.headline,
      priceCents,
      customerEmail: user.email,
      successUrl: `${origin}/advertise?success=1`,
      cancelUrl: `${origin}/advertise`,
    });
    url = session.url;
  } catch {
    return { error: "Couldn't start checkout. Try again." };
  }

  if (!url) return { error: "Couldn't start checkout. Try again." };
  redirect(url);
}

export async function approveAdCampaignAction(campaignId: string): Promise<void> {
  const { supabase, userId } = await requireAdmin();
  const now = new Date();
  const campaign = await getAdCampaignById(supabase, campaignId);
  if (!campaign) return;

  const endsAt = new Date(now.getTime() + campaign.duration_days * 24 * 60 * 60 * 1000);
  await updateAdCampaignStatus(supabase, campaignId, {
    status: "active",
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
  });
  await createAuditLog(supabase, {
    actorId: userId,
    action: "ad_campaign.approved",
    targetType: "ad_campaign",
    targetId: campaignId,
  });
  revalidatePath("/admin/ads");
}

export async function rejectAdCampaignAction(campaignId: string): Promise<void> {
  const { supabase, userId } = await requireAdmin();
  await updateAdCampaignStatus(supabase, campaignId, { status: "rejected" });
  await createAuditLog(supabase, {
    actorId: userId,
    action: "ad_campaign.rejected",
    targetType: "ad_campaign",
    targetId: campaignId,
  });
  revalidatePath("/admin/ads");
}

/** Fire-and-forget from the client when a sponsored slide becomes
 * visible or its "Learn more" gets tapped. Swallows its own errors —
 * same reasoning as recordViewAction: a missed ad event shouldn't
 * surface anywhere in the UI. Silently no-ops when logged out, same as
 * post views — RLS only allows a real auth.uid() to log its own event
 * anyway. */
async function recordAdEventBestEffort(campaignId: string, kind: "impression" | "click") {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user) return;
    await recordAdEvent(supabase, campaignId, kind, user.id);
  } catch {
    // best-effort only
  }
}

export async function recordAdImpressionAction(campaignId: string): Promise<void> {
  await recordAdEventBestEffort(campaignId, "impression");
}

export async function recordAdClickAction(campaignId: string): Promise<void> {
  await recordAdEventBestEffort(campaignId, "click");
}
