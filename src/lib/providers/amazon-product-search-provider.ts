import { signAmzRequest } from "./aws-sigv4";
import type {
  ProductSearchProvider,
  ProductSearchResponse,
  ProductSearchResult,
} from "./product-search-provider";

const HOST = "webservices.amazon.com";
const PATH = "/paapi5/searchitems";
const REGION = "us-east-1";
const SERVICE = "ProductAdvertisingAPI";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";

interface PaapiItem {
  ASIN?: string;
  DetailPageURL?: string;
  ItemInfo?: { Title?: { DisplayValue?: string } };
  Images?: { Primary?: { Medium?: { URL?: string } } };
  Offers?: { Listings?: { Price?: { DisplayAmount?: string } }[] };
}

interface PaapiResponse {
  SearchResult?: { Items?: PaapiItem[] };
  Errors?: { Code: string; Message: string }[];
}

function toResult(item: PaapiItem): ProductSearchResult | null {
  if (!item.ASIN || !item.DetailPageURL || !item.ItemInfo?.Title?.DisplayValue) return null;
  return {
    asin: item.ASIN,
    title: item.ItemInfo.Title.DisplayValue,
    imageUrl: item.Images?.Primary?.Medium?.URL ?? null,
    displayPrice: item.Offers?.Listings?.[0]?.Price?.DisplayAmount ?? null,
    detailPageUrl: item.DetailPageURL,
  };
}

/**
 * Real Product Advertising API 5.0 SearchItems call — signed with
 * AWS SigV4 (aws-sigv4.ts), US marketplace only for now. Requires actual
 * PA-API approval on the Associates account, not just a tracking tag —
 * see get-product-search-provider.ts for what gates this being used at
 * all.
 */
export class AmazonProductSearchProvider implements ProductSearchProvider {
  constructor(
    private readonly accessKey: string,
    private readonly secretKey: string,
    private readonly partnerTag: string,
  ) {}

  async searchProducts(query: string, limit = 6): Promise<ProductSearchResponse> {
    const payload = JSON.stringify({
      Keywords: query,
      ItemCount: Math.min(Math.max(limit, 1), 10),
      PartnerTag: this.partnerTag,
      PartnerType: "Associates",
      Marketplace: "www.amazon.com",
      Resources: [
        "ItemInfo.Title",
        "Images.Primary.Medium",
        "Offers.Listings.Price",
      ],
    });

    const headers = signAmzRequest({
      method: "POST",
      host: HOST,
      path: PATH,
      region: REGION,
      service: SERVICE,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
      amzTarget: TARGET,
      contentEncoding: "amz-1.0",
      contentType: "application/json; charset=utf-8",
      payload,
    });

    const response = await fetch(`https://${HOST}${PATH}`, {
      method: "POST",
      headers,
      body: payload,
    });

    const data = (await response.json()) as PaapiResponse;
    if (!response.ok || data.Errors?.length) {
      const message = data.Errors?.[0]?.Message ?? `PA-API request failed (${response.status})`;
      throw new Error(message);
    }

    const results = (data.SearchResult?.Items ?? [])
      .map(toResult)
      .filter((r): r is ProductSearchResult => r !== null);

    return { results, isMock: false };
  }
}
