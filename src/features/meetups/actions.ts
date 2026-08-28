"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { isMeetupBillingConfigured } from "@/lib/billing/config";
import { createMeetupCheckoutSession } from "@/lib/billing/stripe";
import {
  createMeetup,
  getMeetupById,
  deleteMeetup,
  listMeetupsByHost,
  MEETUP_TIERS,
  isMeetupTier,
  type Meetup,
} from "@/lib/db/meetups";
import { getMeetupViewCountsForMeetups } from "@/lib/db/meetup-views";
import { validateMeetup } from "@/lib/validation/meetup";

export async function deleteMeetupAction(meetupId: string): Promise<void> {
  const { supabase } = await requireUser();
  await deleteMeetup(supabase, meetupId);
  revalidatePath("/discover");
}

export interface CreateMeetupDraftResult {
  error?: string;
  meetupId?: string;
}

/** Creates the unpaid draft row only — checkout happens in a separate
 * action (createMeetupCheckoutAction) because photos still need to be
 * uploaded and attached to this meetup's id in between the two, the same
 * way compose-post-form.tsx creates a post row before attaching its
 * media. Price/tier are looked up here from MEETUP_TIERS (server-side,
 * keyed by tier name) and never taken from the client directly — so even
 * if a tampered request claimed a cheaper price, this is the value that
 * actually gets inserted and later charged for. */
export async function createMeetupDraftAction({
  title,
  description,
  locationName,
  startsAt,
  lat,
  lng,
  tier,
}: {
  title: string;
  description: string;
  locationName: string;
  startsAt: string;
  lat: number | null;
  lng: number | null;
  tier: string;
}): Promise<CreateMeetupDraftResult> {
  if (!isMeetupBillingConfigured()) {
    return { error: "Posting a meetup isn't set up yet." };
  }
  if (!isMeetupTier(tier)) {
    return { error: "Choose a valid tier." };
  }
  const validationError = validateMeetup({ title, locationName, startsAt });
  if (validationError) return { error: validationError };

  const { supabase, user } = await requireUser();

  try {
    const meetup = await createMeetup(supabase, {
      host_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      location_name: locationName.trim(),
      starts_at: new Date(startsAt).toISOString(),
      lat,
      lng,
      tier,
      price_cents: MEETUP_TIERS[tier].priceCents,
    });
    return { meetupId: meetup.id };
  } catch {
    return { error: "Couldn't create that meetup. Try again." };
  }
}

export interface CreateMeetupCheckoutResult {
  error?: string;
  url?: string;
}

export async function createMeetupCheckoutAction({
  meetupId,
  isNative,
}: {
  meetupId: string;
  /** Same native-app redirect handling as ad checkout (see
   * ad-campaign-form.tsx/native-app-bridge.tsx) — Checkout has to run in
   * the system browser there, which needs a revv:// custom-scheme
   * success/cancel URL instead of a normal one. */
  isNative: boolean;
}): Promise<CreateMeetupCheckoutResult> {
  if (!isMeetupBillingConfigured()) {
    return { error: "Posting a meetup isn't set up yet." };
  }

  const { supabase, user } = await requireUser();
  if (!user.email) return { error: "Your account needs a confirmed email." };

  // RLS only lets a host read their own meetup regardless of status —
  // this both confirms ownership and that it still exists in one query,
  // with no separate "does this belong to me" check needed.
  const meetup = await getMeetupById(supabase, meetupId);
  if (!meetup || meetup.host_id !== user.id) {
    return { error: "Couldn't find that meetup." };
  }
  if (meetup.status !== "pending_payment") {
    return { error: "That meetup has already been paid for." };
  }

  const origin = (await headers()).get("origin");
  const successUrl = isNative
    ? "revv://meetup-checkout?success=1"
    : `${origin}/discover?success=1`;
  const cancelUrl = isNative ? "revv://meetup-checkout" : `${origin}/discover`;

  let url: string | null;
  try {
    const session = await createMeetupCheckoutSession({
      meetupId: meetup.id,
      title: meetup.title,
      priceCents: meetup.price_cents,
      customerEmail: user.email,
      successUrl,
      cancelUrl,
    });
    url = session.url;
  } catch {
    return { error: "Couldn't start checkout. Try again." };
  }

  if (!url) return { error: "Couldn't start checkout. Try again." };
  return { url };
}

export interface MeetupWithViewCount {
  meetup: Meetup;
  viewCount: number;
}

export interface MyMeetupsResponse {
  meetups: MeetupWithViewCount[];
  requiresAuth: boolean;
}

/** Backs the "My meetups" panel — every meetup someone has hosted,
 * newest first, with its view count. Returns requiresAuth rather than
 * throwing when logged out, same shape as getMyShopPromotionsAction in
 * features/shops/actions.ts, so the panel can show a clean "log in to
 * see this" message instead of a generic error. */
export async function getMyMeetupsAction(): Promise<MyMeetupsResponse> {
  const user = await getCurrentUser();
  if (!user) return { meetups: [], requiresAuth: true };

  const supabase = await createClient();
  const meetups = await listMeetupsByHost(supabase, user.id);
  const viewCounts = await getMeetupViewCountsForMeetups(
    supabase,
    meetups.map((m) => m.id),
  );
  return {
    meetups: meetups.map((meetup) => ({ meetup, viewCount: viewCounts.get(meetup.id) ?? 0 })),
    requiresAuth: false,
  };
}
