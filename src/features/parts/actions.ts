"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getPartById } from "@/lib/db/parts";
import { recordPartClick } from "@/lib/db/part-clicks";
import { getAffiliateProvider } from "@/lib/providers/get-affiliate-provider";
import type { AffiliateLink } from "@/lib/providers/affiliate-provider";

export async function getAffiliateLinkAction(
  partId: string,
): Promise<AffiliateLink | null> {
  const supabase = await createClient();
  const part = await getPartById(supabase, partId);
  if (!part) return null;

  const provider = getAffiliateProvider();
  return provider.getAffiliateLink(part);
}

/** Fire-and-forget: a click a build owner should see in their own
 * modification list, never something that should block or fail the
 * actual Buy flow. Silently skipped for a logged-out clicker. */
export async function recordPartClickAction(buildPartId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  await recordPartClick(supabase, buildPartId, user.id).catch(() => {});
}
