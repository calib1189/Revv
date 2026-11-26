"use client";

import { isAndroidApp } from "@/lib/native/android-app";

/**
 * Google Play Billing in the Android app. The app is this site in Chrome
 * (a Trusted Web Activity), and Chrome connects the page to Play Billing
 * through the Digital Goods API (prices, past purchases) and the Payment
 * Request API (the purchase sheet itself). Both only exist when the app
 * was built with Play Billing switched on; anywhere else this returns
 * nothing and the store offers no packs.
 *
 * The server confirms every purchase with Google before crediting it
 * (confirmGooglePurchaseAction), so nothing reported here is trusted.
 */

const PLAY_BILLING = "https://play.google.com/billing";

interface ItemDetails {
  itemId: string;
  price: { currency: string; value: string };
}
interface PurchaseDetails {
  itemId: string;
  purchaseToken: string;
}
interface DigitalGoodsService {
  getDetails(itemIds: string[]): Promise<ItemDetails[]>;
  listPurchases(): Promise<PurchaseDetails[]>;
}
type WithDigitalGoods = Window & { getDigitalGoodsService?: (provider: string) => Promise<DigitalGoodsService> };

async function service(): Promise<DigitalGoodsService | null> {
  if (!isAndroidApp() || typeof PaymentRequest === "undefined") return null;
  const get = (window as WithDigitalGoods).getDigitalGoodsService;
  if (!get) return null;
  try {
    return (await get(PLAY_BILLING)) ?? null;
  } catch {
    return null;
  }
}

/** Whether this Android app can take a Play purchase. */
export async function playBillingAvailable(): Promise<boolean> {
  return (await service()) !== null;
}

/** Play's prices by product id, in the buyer's own currency. */
export async function playPrices(productIds: string[]): Promise<Record<string, string>> {
  const s = await service();
  if (!s) return {};
  const details = await s.getDetails(productIds);
  return Object.fromEntries(
    details.map((d) => {
      let label = `${d.price.value} ${d.price.currency}`;
      try {
        label = new Intl.NumberFormat(undefined, { style: "currency", currency: d.price.currency }).format(Number(d.price.value));
      } catch {
        // Keep the plain value.
      }
      return [d.itemId, label];
    }),
  );
}

/** Opens Google Play's purchase sheet for one product. */
export async function buyWithGoogle(
  productId: string,
): Promise<{ status: "purchased"; purchaseToken: string } | { status: "cancelled" }> {
  const request = new PaymentRequest([{ supportedMethods: PLAY_BILLING, data: { sku: productId } }], {
    total: { label: "Total", amount: { currency: "USD", value: "0" } },
  });
  let response: PaymentResponse;
  try {
    response = await request.show();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { status: "cancelled" };
    throw err;
  }
  const { purchaseToken } = response.details as { purchaseToken?: string };
  await response.complete(purchaseToken ? "success" : "fail");
  if (!purchaseToken) throw new Error("Google Play didn't return the purchase.");
  return { status: "purchased", purchaseToken };
}

/** Purchases Google completed that SORZA hasn't consumed yet (the app
 * closed before the points were confirmed). */
export async function unconsumedGooglePurchases(): Promise<PurchaseDetails[]> {
  const s = await service();
  if (!s) return [];
  return s.listPurchases().catch(() => []);
}
