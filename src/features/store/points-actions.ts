"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createPointsCheckoutSession } from "@/lib/billing/stripe";
import { packById, pointsPacksEnabled } from "@/lib/points/packs";
import { checkAppleTransaction, fetchAppleTransaction, appleIapConfig } from "@/lib/points/apple-iap";
import { creditPointsPurchase } from "@/lib/points/credit";
import { SITE_URL } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { notifyAdminsOfSale } from "@/lib/admin/notify-sale";
import { pointsSale } from "@/lib/sales/sale";

async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getProfileByUserId(await createClient(), userId).catch(() => null);
  return profile?.is_admin ?? false;
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Web: a Stripe Checkout for a points pack. The webhook credits it. */
export async function startPointsCheckoutAction(packId: string): Promise<Result<{ url: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to buy points." };
  if (!pointsPacksEnabled(await isAdmin(user.id))) return { ok: false, error: "Buying points isn't switched on yet." };
  const pack = packById(packId);
  if (!pack) return { ok: false, error: "That pack isn't available." };
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false, error: "Buying points isn't switched on yet." };
  try {
    const session = await createPointsCheckoutSession({
      userId: user.id,
      packId: pack.id,
      points: pack.points,
      priceCents: pack.priceCents,
      customerEmail: user.email ?? null,
      successUrl: `${SITE_URL}/store?points=added`,
      cancelUrl: `${SITE_URL}/store`,
    });
    if (!session.url) return { ok: false, error: "Couldn't start checkout. Try again." };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("Points checkout failed:", err);
    return { ok: false, error: "Couldn't start checkout. Try again." };
  }
}

/** iPhone: credits an App Store purchase after checking it with Apple.
 * Safe to call again for the same transaction (it credits once). */
export async function confirmApplePurchaseAction(transactionId: string): Promise<Result<{ points: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to buy points." };
  const config = appleIapConfig();
  if (!config || !pointsPacksEnabled(await isAdmin(user.id))) return { ok: false, error: "In-app purchases aren't switched on yet." };
  try {
    const transaction = await fetchAppleTransaction(transactionId);
    if (!transaction) return { ok: false, error: "The App Store doesn't have that purchase." };
    const check = checkAppleTransaction(transaction, { bundleId: config.bundleId, userId: user.id });
    if (!check.ok) {
      console.error("Apple purchase refused:", check.reason, transactionId);
      return { ok: false, error: "That purchase couldn't be added to this account." };
    }
    const credited = await creditPointsPurchase({
      userId: user.id,
      provider: "apple",
      providerRef: check.transactionId,
      pack: check.pack,
      amountCents: check.pack.priceCents,
      currency: "usd",
    });
    if (credited.isNew) {
      const { pack } = check;
      after(() => notifyAdminsOfSale({ buyerId: user.id, amountCents: pack.priceCents, item: pointsSale({ points: pack.points, provider: "apple" }) }));
    }
    revalidatePath("/store");
    return { ok: true, points: check.pack.points };
  } catch (err) {
    console.error("Apple purchase not credited:", err);
    return { ok: false, error: "Couldn't add your points yet. They'll be added the next time you open the store." };
  }
}
