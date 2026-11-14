import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createPrintfulOrder, type DecalRecipient } from "@/lib/decals/printful";
import { RANK_LABELS, type RankTier } from "@/lib/rating/rank";
import { SITE_URL } from "@/lib/site-url";

// Server-only. Runs when Stripe confirms a decal payment.

interface StripeAddress {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}
interface StripeShipping {
  name?: string | null;
  address?: StripeAddress | null;
}

/** The shipping address from a Checkout session (Stripe moved it into
 * collected_information in newer API versions; older ones keep it on the
 * session itself). */
export function recipientFromSession(session: Record<string, unknown>): DecalRecipient | null {
  const collected = session.collected_information as { shipping_details?: StripeShipping } | null | undefined;
  const shipping = collected?.shipping_details ?? (session.shipping_details as StripeShipping | null | undefined);
  const a = shipping?.address;
  const email = (session.customer_details as { email?: string | null } | null | undefined)?.email ?? null;
  if (!shipping?.name || !a?.line1 || !a.city || !a.state || !a.postal_code || !a.country) return null;
  return {
    name: shipping.name,
    address1: a.line1,
    address2: a.line2 ?? null,
    city: a.city,
    stateCode: a.state,
    zip: a.postal_code,
    countryCode: a.country,
    email,
  };
}

/** Marks the order paid and sends it to the printer. Stripe retries
 * webhooks, so only the first call for an order gets past the
 * awaiting_payment check; a printer failure is saved on the order for an
 * admin to follow up rather than retried blindly. Returns the order when
 * this call recorded the payment, null for a retry or an unpaid session. */
export async function fulfillDecalOrder(session: Record<string, unknown>, orderId: string): Promise<{ user_id: string; amount_cents: number; tier: string } | null> {
  if (session.payment_status !== "paid") return null;
  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("decal_orders")
    .update({ status: "paid", stripe_session_id: String(session.id), updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "awaiting_payment")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const fail = async (message: string) => {
    await supabase
      .from("decal_orders")
      .update({ status: "failed", error: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", order.id);
    return order;
  };

  if (Number(session.amount_total) !== order.amount_cents) return fail(`Paid ${String(session.amount_total)}, expected ${order.amount_cents}.`);
  const recipient = recipientFromSession(session);
  if (!recipient) return fail("No complete shipping address on the Stripe session.");

  try {
    const printerOrderId = await createPrintfulOrder({
      orderId: order.id,
      recipient,
      // The badge print file (scripts/make-decal-print-files.py), not the
      // bare emblem: the die-cut follows the badge's clean outline.
      fileUrl: `${SITE_URL}/decals/print/${order.tier}.png`,
      previewName: `SORZA ${RANK_LABELS[order.tier as RankTier]} rank decal`,
    });
    await supabase
      .from("decal_orders")
      .update({ status: "sent_to_printer", printer_order_id: printerOrderId, error: null, updated_at: new Date().toISOString() })
      .eq("id", order.id);
  } catch (err) {
    await fail(err instanceof Error ? err.message : String(err));
  }
  return order;
}
