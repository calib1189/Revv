"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getProfileByUserId } from "@/lib/db/profiles";
import { createTeeCheckoutSession } from "@/lib/billing/stripe";
import { merchEnabled, teeOrderLine } from "@/lib/merch/products";
import { SITE_URL } from "@/lib/site-url";

type Result = { ok: true; url: string } | { ok: false; error: string };

/** Starts a tee order: the design, size, variant and price are looked up
 * here (never trusted from the page), then Stripe's checkout collects
 * payment and the shipping address. */
export async function startTeeOrderAction(designId: string, size: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to order a shirt." };
  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id).catch(() => null);
  if (!merchEnabled(profile?.is_admin ?? false)) return { ok: false, error: "Shirts aren't available yet." };
  const line = teeOrderLine(designId, size);
  if (!line) return { ok: false, error: "Pick a size." };

  const service = createServiceRoleClient();
  const { data: order, error } = await service
    .from("tee_orders")
    .insert({
      user_id: user.id,
      design: line.design.id,
      size: line.size,
      variant_id: line.variantId,
      amount_cents: line.priceCents,
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("Tee order not created:", error);
    return { ok: false, error: "Couldn't start your order. Try again." };
  }

  try {
    const session = await createTeeCheckoutSession({
      orderId: order.id,
      name: `SORZA tee: ${line.design.name}`,
      description: `${line.design.color}, size ${line.size}. Gildan 5000 heavy cotton. Free US shipping.`,
      priceCents: line.priceCents,
      customerEmail: user.email ?? null,
      successUrl: `${SITE_URL}/store?tee=ordered`,
      cancelUrl: `${SITE_URL}/store`,
    });
    await service.from("tee_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    if (!session.url) return { ok: false, error: "Couldn't start checkout. Try again." };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("Tee checkout failed:", err);
    await service.from("tee_orders").update({ status: "canceled" }).eq("id", order.id);
    return { ok: false, error: "Couldn't start checkout. Try again." };
  }
}
