import type { Part } from "@/lib/db/parts";

export interface AffiliateLink {
  url: string | null;
  isMock: boolean;
}

export interface AffiliateProvider {
  getAffiliateLink(part: Part): Promise<AffiliateLink>;
}
