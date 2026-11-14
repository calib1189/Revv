import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPushToUser } from "@/lib/push/send";
import { salePush, type SaleItem } from "@/lib/sales/sale";

/** Pushes every admin (iPhone app and any browser they've turned push
 * on in) that someone just paid real money. Called once per purchase,
 * from wherever the payment is first recorded, so a provider retrying
 * its webhook doesn't push twice. Best-effort: never throws, so a push
 * problem can't fail recording the sale. An admin's own test purchases
 * push too, which is how you can see it working. */
export async function notifyAdminsOfSale(sale: { buyerId: string; amountCents: number; item: SaleItem }): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const [{ data: admins }, { data: buyer }] = await Promise.all([
      supabase.from("profiles").select("id").eq("is_admin", true),
      supabase.from("profiles").select("username").eq("id", sale.buyerId).maybeSingle(),
    ]);
    const payload = salePush(sale.item, sale.amountCents, buyer?.username ?? null);
    await Promise.allSettled((admins ?? []).map((a) => sendPushToUser(a.id, payload, "updates")));
  } catch (err) {
    // The sale itself is recorded; it still shows in Admin → Sales.
    console.error("Sale push not sent:", err);
  }
}
