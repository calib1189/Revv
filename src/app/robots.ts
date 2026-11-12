import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/** Crawlers that gather pages and photos to train AI models. They bring
 * no visitors, and each crawl downloads the site's photos in bulk, which
 * is paid bandwidth on Vercel and Supabase. Search engines stay allowed:
 * shared build pages turning up in Google is how new people find SORZA. */
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  "Google-Extended",
  "Applebot-Extended",
  "PerplexityBot",
  "Diffbot",
  "ImagesiftBot",
  "Omgilibot",
  "Omgili",
  "cohere-ai",
  "YouBot",
  "Timpibot",
  "PetalBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_CRAWLERS, disallow: "/" },
      {
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
          // Resized photos, the video editor's 32MB engine, page videos
          // and API routes: nothing a search result needs, and the
          // heaviest things to hand a crawler.
          "/_next/image",
          "/ffmpeg/",
          "/video/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
