"use client";

// The iPhone app's in-app purchase for points packs. The native half is
// PointsStorePlugin in ios/App/App/MainViewController.swift. On the web,
// and on app builds from before it existed, none of this is available
// and the store offers Stripe (web) or an update prompt (old app).

interface PointsStorePlugin {
  products(options: { ids: string[] }): Promise<{ products: { id: string; displayPrice: string }[] }>;
  purchase(options: { productId: string; accountToken: string }): Promise<{
    status: "purchased" | "cancelled" | "pending";
    transactionId?: string;
  }>;
  finish(options: { transactionId: string }): Promise<void>;
  unfinished(): Promise<{ transactionIds: string[] }>;
}

export type StoreEnvironment = "web" | "app" | "old-app";

// Kept inside a plain object, never returned bare from an async function:
// a Capacitor plugin proxy answers `then`, so awaiting it would hang
// (see loadPlugin in ./push.ts).
async function load(): Promise<{ env: StoreEnvironment; plugin: PointsStorePlugin | null }> {
  const { Capacitor, registerPlugin } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return { env: "web", plugin: null };
  if (!Capacitor.isPluginAvailable("PointsStore")) return { env: "old-app", plugin: null };
  return { env: "app", plugin: registerPlugin<PointsStorePlugin>("PointsStore") };
}

export async function storeEnvironment(): Promise<StoreEnvironment> {
  return (await load()).env;
}

/** App Store prices by product id, in the buyer's own currency. */
export async function appStorePrices(productIds: string[]): Promise<Record<string, string>> {
  const { plugin } = await load();
  if (!plugin) return {};
  const { products } = await plugin.products({ ids: productIds });
  return Object.fromEntries(products.map((p) => [p.id, p.displayPrice]));
}

export async function buyWithApple(productId: string, userId: string) {
  const { plugin } = await load();
  if (!plugin) throw new Error("In-app purchases aren't available in this version of the app.");
  return plugin.purchase({ productId, accountToken: userId });
}

export async function finishAppleTransaction(transactionId: string): Promise<void> {
  const { plugin } = await load();
  await plugin?.finish({ transactionId });
}

export async function unfinishedAppleTransactions(): Promise<string[]> {
  const { plugin } = await load();
  if (!plugin) return [];
  return (await plugin.unfinished()).transactionIds;
}
