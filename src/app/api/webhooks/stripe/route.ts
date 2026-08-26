import { NextResponse, type NextRequest } from "next/server";
import { verifyStripeSignature } from "@/lib/billing/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SHOP_PROMOTION_DURATION_DAYS } from "@/lib/db/shop-promotions";
import type { Subscription } from "@/lib/db/subscriptions";

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
      // Payment confirmed — straight to 'active', no review step. A
      // meetup is a normal community listing (title/description/location/
      // time), not paid content interspersed into the main feed the way
      // an ad campaign is, so the existing reports system is the
      // moderation backstop here rather than a pre-publish gate.
      const meetupId = metadata.meetup_id;
      if (meetupId) {
        const { error } = await supabase
          .from("meetups")
          .update({
            status: "active",
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

    const userId = metadata?.user_id;
    const customerId = session.customer as string | undefined;
    const subscriptionId = session.subscription as string | undefined;

    if (userId && customerId) {
      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId ?? null,
          status: "active",
        },
        { onConflict: "user_id" },
      );
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  } else if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    const subscriptionId = subscription.id as string;
    const periodEnd = subscription.current_period_end as number | undefined;
    const status: Subscription["status"] =
      event.type === "customer.subscription.deleted"
        ? "canceled"
        : (subscription.status as Subscription["status"]);

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status,
        current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      })
      .eq("stripe_subscription_id", subscriptionId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
