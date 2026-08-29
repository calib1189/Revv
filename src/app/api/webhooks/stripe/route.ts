import { NextResponse, type NextRequest } from "next/server";
import { verifyStripeSignature } from "@/lib/billing/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SHOP_PROMOTION_DURATION_DAYS } from "@/lib/db/shop-promotions";

interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhooks not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  if (!signature || !verifyStripeSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;
  const supabase = createServiceRoleClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata as Record<string, string> | undefined;

    if (metadata?.type === "ad_campaign") {
      // Payment confirmed — moves the campaign into the admin review
      // queue. Deliberately not straight to "active": a real charge
      // going through doesn't mean the ad content itself has been
      // looked at yet, and this is the only gate between "anyone with a
      // card" and something actually appearing in the public feed.
      const campaignId = metadata.campaign_id;
      if (campaignId) {
        const { error } = await supabase
          .from("ad_campaigns")
          .update({
            status: "pending_review",
            stripe_checkout_session_id: (session.id as string) ?? null,
          })
          .eq("id", campaignId);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (metadata?.type === "meetup") {
      // Payment confirmed — moves the meetup into the admin review queue,
      // same as an ad campaign. Not straight to 'active': a real charge
      // doesn't mean the listing's content has actually been looked at.
      const meetupId = metadata.meetup_id;
      if (meetupId) {
        const { error } = await supabase
          .from("meetups")
          .update({
            status: "pending_review",
            stripe_checkout_session_id: (session.id as string) ?? null,
          })
          .eq("id", meetupId);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (metadata?.type === "shop_promotion") {
      // Payment confirmed — straight to 'active' for a fixed 30-day
      // window starting now, no review step (this is a paid placement
      // over Google's own listing data, not REVV-hosted content).
      const promotionId = metadata.promotion_id;
      if (promotionId) {
        const now = new Date();
        const endsAt = new Date(now.getTime() + SHOP_PROMOTION_DURATION_DAYS * 24 * 60 * 60 * 1000);
        const { error } = await supabase
          .from("shop_promotions")
          .update({
            status: "active",
            starts_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
            stripe_checkout_session_id: (session.id as string) ?? null,
          })
          .eq("id", promotionId);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
      return NextResponse.json({ received: true });
    }
  }

  return NextResponse.json({ received: true });
}
