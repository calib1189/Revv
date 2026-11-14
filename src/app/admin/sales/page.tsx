import { createClient } from "@/lib/supabase/server";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listRecentSales } from "@/lib/db/sales";
import { SalesView, SALES_DAYS } from "@/features/admin/sales-view";

/** Every real-money purchase: what came in lately, then each sale,
 * newest first. */
export default async function AdminSalesPage() {
  const supabase = await createClient();
  const sales = await listRecentSales(supabase, SALES_DAYS);
  const buyers = await getProfilesByIds(supabase, [...new Set(sales.map((s) => s.buyerId))]);
  return (
    <SalesView
      sales={sales}
      usernames={Object.fromEntries(buyers.map((p) => [p.id, p.username]))}
      now={new Date().getTime()}
    />
  );
}
