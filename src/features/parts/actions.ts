"use server";

import { createClient } from "@/lib/supabase/server";
import { getPartById } from "@/lib/db/parts";
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
