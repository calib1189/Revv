/** Social links and a website on a profile (0138). Handles are stored
 * bare and the link is built here, so a saved handle can only ever open
 * that platform. People paste all sorts ("@name", a full profile link,
 * "site.com"), so everything is normalized before it's checked. */

export type SocialPlatform = "instagram" | "tiktok" | "youtube" | "snapchat";

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "youtube", "snapchat"];

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  snapchat: "Snapchat",
};

/** Mirrors the check constraints in 0138_profile_links.sql. */
const HANDLE_PATTERN: Record<SocialPlatform, RegExp> = {
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  tiktok: /^[A-Za-z0-9._]{1,24}$/,
  youtube: /^[A-Za-z0-9._-]{1,30}$/,
  snapchat: /^[A-Za-z][A-Za-z0-9._-]{1,14}$/,
};

const HOSTS: Record<SocialPlatform, string> = {
  instagram: "instagram.com",
  tiktok: "tiktok.com",
  youtube: "youtube.com",
  snapchat: "snapchat.com",
};

export type Normalized = { value: string | null; error?: undefined } | { value?: undefined; error: string };

function fromLink(platform: SocialPlatform, raw: string): string | null | "wrong-site" {
  if (!/[/.]/.test(raw) || !/\.[a-z]{2,}/i.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  if (host !== HOSTS[platform]) return "wrong-site";
  const parts = url.pathname.split("/").filter(Boolean);
  const segment = platform === "snapchat" && parts[0] === "add" ? parts[1] : parts[0];
  return segment ? decodeURIComponent(segment) : "";
}

export function normalizeHandle(platform: SocialPlatform, raw: string): Normalized {
  let value = raw.trim();
  if (!value) return { value: null };
  const linked = fromLink(platform, value);
  if (linked === "wrong-site") return { error: `That's not a ${SOCIAL_LABELS[platform]} link.` };
  if (linked !== null) value = linked;
  value = value.replace(/^@/, "");
  if (!HANDLE_PATTERN[platform].test(value)) {
    return { error: `That doesn't look like a ${SOCIAL_LABELS[platform]} username.` };
  }
  return { value };
}

const MAX_WEBSITE = 200;

export function normalizeWebsite(raw: string): Normalized {
  let value = raw.trim();
  if (!value) return { value: null };
  if (/^http:\/\//i.test(value)) value = value.replace(/^http:\/\//i, "https://");
  else if (!/^https:\/\//i.test(value)) {
    // Anything with its own scheme (javascript:, mailto:) isn't a website.
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[^:/]+\.[^:/]+:\d+/.test(value)) {
      return { error: "Enter a web address, like yoursite.com." };
    }
    value = `https://${value}`;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { error: "Enter a web address, like yoursite.com." };
  }
  if (!url.hostname.includes(".") || /\s/.test(value)) {
    return { error: "Enter a web address, like yoursite.com." };
  }
  if (value.length > MAX_WEBSITE) return { error: "That web address is too long." };
  return { value };
}

export function profileLinkUrl(platform: SocialPlatform, handle: string): string {
  const h = encodeURIComponent(handle);
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${h}`;
    case "tiktok":
      return `https://www.tiktok.com/@${h}`;
    case "youtube":
      return `https://www.youtube.com/@${h}`;
    case "snapchat":
      return `https://www.snapchat.com/add/${h}`;
  }
}
