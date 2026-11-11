import { NextResponse, after, type NextRequest } from "next/server";
import { findCheckoutSessionByPaymentIntent, verifyStripeSignature } from "@/lib/billing/stripe";
import { packById } from "@/lib/points/packs";
import { creditPointsPurchase, refundPointsPurchase } from "@/lib/points/credit";
import { fulfillDecalOrder } from "@/lib/decals/fulfill";
import { markPosterPaid, printPosterOrder } from "@/features/posters/fulfill";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { SHOP_PROMOTION_DURATION_DAYS } from "@/lib/db/shop-promotions";
import { applyPromotionPicture } from "@/lib/db/shop-pictures";

// A paid poster is rendered and sent to the printer after the webhook
// has answered (posters/fulfill.ts); this is the time that work gets.
export const maxDuration = 60;

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
      // over Google's own listing data, not SORZA-hosted content).
      const promotionId = metadata.promotion_id;
      if (promotionId) {
        const now = new Date();
        const endsAt = new Date(now.getTime() + SHOP_PROMOTION_DURATION_DAYS * 24 * 60 * 60 * 1000);
        const { data: promotion, error } = await supabase
          .from("shop_promotions")
          .update({
            status: "active",
            starts_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
            stripe_checkout_session_id: (session.id as string) ?? null,
          })
          .eq("id", promotionId)
          .select("*")
          .maybeSingle();
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        // Never fails the webhook: the paid promotion is what matters, and
        // a picture that didn't land can still be added from the shop page.
        if (promotion) {
          try {
            await applyPromotionPicture(supabase, promotion);
          } catch (pictureError) {
            console.error("Shop promotion picture not applied:", pictureError);
          }
        }
      }
      return NextResponse.json({ received: true });
    }

    if (metadata?.type === "points_pack") {
      // Credits the pack's points once. The pack, and so the points and
      // price, come from our own table by id, never from the client, and
      // the amount actually paid has to match it.
      const pack = packById(metadata.pack_id ?? "");
      if (pack && metadata.user_id && session.payment_status === "paid" && Number(session.amount_total) === pack.priceCents) {
        try {
          await creditPointsPurchase({
            userId: metadata.user_id,
            provider: "stripe",
            providerRef: String(session.id),
            pack,
            amountCents: pack.priceCents,
            currency: String(session.currency ?? "usd"),
          });
        } catch (creditError) {
          console.error("Points pack not credited:", creditError);
          return NextResponse.json({ error: "Not credited" }, { status: 500 });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (metadata?.type === "rank_decal") {
      if (metadata.order_id) {
        try {
          await fulfillDecalOrder(session, metadata.order_id);
        } catch (decalError) {
          console.error("Decal order not processed:", decalError);
          return NextResponse.json({ error: "Not processed" }, { status: 500 });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (metadata?.type === "build_poster") {
      const orderId = metadata.order_id;
      if (orderId) {
        try {
          // Marked paid now, so a retried webhook doesn't print twice;
          // the print file takes several seconds to render, so that part
          // runs once Stripe has its answer.
          if (await markPosterPaid(session, orderId)) after(() => printPosterOrder(session, orderId));
        } catch (posterError) {
          console.error("Poster order not processed:", posterError);
          return NextResponse.json({ error: "Not processed" }, { status: 500 });
        }
      }
      return NextResponse.json({ received: true });
    }
  }

  if (event.type === "charge.refunded") {
    // A refunded points pack takes its points back. Other refunds are
    // handled by hand.
    // Only a full refund counts; the session it came from says what it was.
    const charge = event.data.object;
    const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (paymentIntent && charge.refunded === true) {
      try {
        const session = await findCheckoutSessionByPaymentIntent(paymentIntent);
        if (session?.metadata?.type === "points_pack") await refundPointsPurchase("stripe", session.id);
      } catch (refundError) {
        console.error("Points refund not applied:", refundError);
        return NextResponse.json({ error: "Not applied" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
