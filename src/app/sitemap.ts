import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";
import { listSitemapVehicles } from "@/lib/db/vehicles";
import { listSitemapPosts } from "@/lib/db/posts";
import { listSitemapProfiles } from "@/lib/db/profiles";

const STATIC_ROUTES = ["", "/login", "/signup", "/legal/terms", "/legal/privacy", "/legal/guidelines"];

/**
 * Public build pages are the acquisition loop (people share their
 * /garage/[vehicleId] link to forums and IG — see CLAUDE.md's V3 note),
 * so they need to actually be in the sitemap to get indexed, not just be
 * reachable by direct link. Posts and profiles are public for the same
 * reason. A banned user's own content still works if linked directly
 * (is_banned only blocks new posts/comments, see 0055_user_bans.sql) but
 * isn't worth actively promoting in search results, so those are
 * filtered out here rather than at the RLS layer.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));

  if (!isSupabaseConfigured()) return staticEntries;

  const supabase = await createClient();
  const [vehicles, posts, profiles] = await Promise.all([
    listSitemapVehicles(supabase),
    listSitemapPosts(supabase),
    listSitemapProfiles(supabase),
  ]);

  const bannedIds = new Set(profiles.filter((p) => p.isBanned).map((p) => p.id));

  const vehicleEntries: MetadataRoute.Sitemap = vehicles
    .filter((v) => !bannedIds.has(v.ownerId))
    .map((v) => ({
      url: `${SITE_URL}/garage/${v.id}`,
      lastModified: new Date(v.createdAt),
    }));

  const postEntries: MetadataRoute.Sitemap = posts
    .filter((p) => !bannedIds.has(p.authorId))
    .map((p) => ({
      url: `${SITE_URL}/p/${p.id}`,
      lastModified: new Date(p.createdAt),
    }));

  const profileEntries: MetadataRoute.Sitemap = profiles
    .filter((p) => !p.isBanned)
    .map((p) => ({
      url: `${SITE_URL}/u/${p.username}`,
      lastModified: new Date(p.createdAt),
    }));

  return [...staticEntries, ...vehicleEntries, ...postEntries, ...profileEntries];
}
