import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getPointsBalance, listOwnedItemIds } from "@/lib/db/points";
import { StorePageContent } from "@/features/store/store-page-content";

export default async function StorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/store");

  const supabase = await createClient();

  // Best-effort: a not-yet-migrated points_ledger/store_items_owned
  // shouldn't crash the page — it just opens with a 0 balance and
  // nothing owned, which is the honest state before that migration
  // has run anyway.
  let balance = 0;
  let ownedItemIds: string[] = [];
  try {
    const [balanceResult, ownedResult] = await Promise.all([
      getPointsBalance(supabase, user.id),
      listOwnedItemIds(supabase, user.id),
    ]);
    balance = balanceResult;
    ownedItemIds = [...ownedResult];
  } catch (err) {
    console.error("Store data fetch failed:", err);
  }

  const profile = await getProfileByUserId(supabase, user.id);

  return (
    <StorePageContent
      initialBalance={balance}
      initialOwnedItemIds={ownedItemIds}
      initialEquipped={{
        name_color: profile?.equipped_name_color ?? null,
        profile_background: profile?.equipped_profile_background ?? null,
        showcase_frame: profile?.equipped_showcase_frame ?? null,
      }}
      username={profile?.username ?? user.id}
    />
  );
}
