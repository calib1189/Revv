// Server-only. Runs when Stripe confirms a poster payment.
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createPrintfulOrder } from "@/lib/decals/printful";
import { recipientFromSession } from "@/lib/decals/fulfill";
import { posterProductById, printPixels } from "@/lib/posters/products";
import { parsePosterSnapshot } from "@/lib/posters/snapshot";
import { SITE_URL } from "@/lib/site-url";
import { renderPoster } from "@/features/posters/poster-art";
import { fetchPosterPhoto } from "@/features/posters/poster-photo";

const BUCKET = "poster-prints";
/** How long Printful's link to the print file works. It downloads the
 * file when the order is created; the slack covers a draft confirmed
 * later. */
const LINK_SECONDS = 60 * 60 * 24 * 30;

/** Marks the order paid. Stripe retries webhooks, so only the first call
 * for an order gets past the awaiting_payment check; returns whether
 * this call did (the order, which still needs printing) or null. */
export async function markPosterPaid(
  session: Record<string, unknown>,
  orderId: string,
): Promise<{ user_id: string; product: string; amount_cents: number } | null> {
  if (session.payment_status !== "paid") return null;
  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("poster_orders")
    .update({ status: "paid", stripe_session_id: String(session.id), updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "awaiting_payment")
    .select("id, user_id, product, amount_cents")
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;
  if (Number(session.amount_total) !== order.amount_cents) {
    await failOrder(orderId, `Paid ${String(session.amount_total)}, expected ${order.amount_cents}.`);
    return null;
  }
  return order;
}

async function failOrder(orderId: string, message: string) {
  await createServiceRoleClient()
    .from("poster_orders")
    .update({ status: "failed", error: message.slice(0, 500), updated_at: new Date().toISOString() })
    .eq("id", orderId);
}

/**
 * Renders the print file from the order's snapshot, stores it, and sends
 * the order to Printful. Runs after the webhook has answered (rendering
 * takes several seconds). A failure is saved on the order for an admin
 * to follow up rather than retried blindly: the customer has paid.
 */
export async function printPosterOrder(session: Record<string, unknown>, orderId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  try {
    const { data: order, error } = await supabase.from("poster_orders").select("*").eq("id", orderId).maybeSingle();
    if (error) throw error;
    if (!order || order.status !== "paid") return;

    const product = posterProductById(order.product);
    const snapshot = parsePosterSnapshot(order.snapshot);
    if (!product || !snapshot) return failOrder(orderId, "The order's product or poster details are invalid.");
    const recipient = recipientFromSession(session);
    if (!recipient) return failOrder(orderId, "No complete shipping address on the Stripe session.");

    const photoUrl = supabase.storage.from("media").getPublicUrl(snapshot.photoPath).data.publicUrl;
    const photo = await fetchPosterPhoto(photoUrl, SITE_URL, 3840);
    const png = await renderPoster(snapshot, photo, printPixels(product));

    const path = `${orderId}.png`;
    const upload = await supabase.storage.from(BUCKET).upload(path, new Uint8Array(png), { contentType: "image/png", upsert: true });
    if (upload.error) throw upload.error;
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
    if (signed.error || !signed.data) throw signed.error ?? new Error("No link to the print file.");

    const printerOrderId = await createPrintfulOrder({
      orderId,
      recipient,
      fileUrl: signed.data.signedUrl,
      previewName: `SORZA build poster: ${snapshot.carName}`,
      variantId: product.variantId,
    });
    await supabase
      .from("poster_orders")
      .update({ status: "sent_to_printer", print_file_path: path, printer_order_id: printerOrderId, error: null, updated_at: new Date().toISOString() })
      .eq("id", orderId);
  } catch (err) {
    console.error("Poster order not printed:", err);
    await failOrder(orderId, err instanceof Error ? err.message : String(err));
  }
}

