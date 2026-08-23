import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/settings",
        "/messages",
        "/notifications",
        "/saved",
        "/friends",
        "/feed/new",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
