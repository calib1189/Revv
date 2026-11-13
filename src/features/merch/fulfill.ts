// Server-only. Runs when Stripe confirms a tee payment.
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createPrintfulOrder } from "@/lib/decals/printful";
import { recipientFromSession } from "@/lib/decals/fulfill";
import { teeById, teePrintFiles } from "@/lib/merch/products";
import { SITE_URL } from "@/lib/site-url";

/** Marks the order paid and sends it to the printer. Stripe retries
 * webhooks, so only the first call for an order gets past the
 * awaiting_payment check; a printer failure is saved on the order for an
 * admin to follow up rather than retried blindly: the customer has paid. */
export async function fulfillTeeOrder(session: Record<string, unknown>, orderId: string): Promise<void> {
  if (session.payment_status !== "paid") return;
  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("tee_orders")
    .update({ status: "paid", stripe_session_id: String(session.id), updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "awaiting_payment")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!order) return;

  const fail = async (message: string) => {
    await supabase
      .from("tee_orders")
      .update({ status: "failed", error: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", order.id);
  };

  if (Number(session.amount_total) !== order.amount_cents) return fail(`Paid ${String(session.amount_total)}, expected ${order.amount_cents}.`);
  const design = teeById(order.design);
  if (!design) return fail(`Unknown design ${order.design}.`);
  const recipient = recipientFromSession(session);
  if (!recipient) return fail("No complete shipping address on the Stripe session.");

  try {
    const printerOrderId = await createPrintfulOrder({
      orderId: order.id,
      recipient,
      files: teePrintFiles(design.id, SITE_URL),
      previewName: `SORZA tee: ${design.name} (${order.size})`,
      variantId: order.variant_id,
    });
    await supabase
      .from("tee_orders")
      .update({ status: "sent_to_printer", printer_order_id: printerOrderId, error: null, updated_at: new Date().toISOString() })
      .eq("id", order.id);
  } catch (err) {
    console.error("Tee order not sent to the printer:", err);
    await fail(err instanceof Error ? err.message : String(err));
  }
}
