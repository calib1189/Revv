import type { ComponentType, SVGProps } from "react";
import { GlobeIcon, InstagramIcon, SnapchatIcon, TikTokIcon, YouTubeIcon } from "@/components/ui/icons";
import { profileLinkUrl, SOCIAL_LABELS, type SocialPlatform } from "@/lib/validation/profile-links";

const ICONS: Record<SocialPlatform, ComponentType<SVGProps<SVGSVGElement>>> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  snapchat: SnapchatIcon,
};

export interface ProfileLinkFields {
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  youtube_handle?: string | null;
  snapchat_handle?: string | null;
  website_url?: string | null;
}

/** Someone's socials and website, as a row of round icons under their bio,
 * with the website shown by name. Renders nothing when there are none
 * (or before 0138 has run and the columns don't exist yet). Links open
 * outside SORZA and are marked as user-supplied. */
export function ProfileLinks({ profile, className = "" }: { profile: ProfileLinkFields; className?: string }) {
  const socials = (["instagram", "tiktok", "youtube", "snapchat"] as const).flatMap((platform) => {
    const handle = profile[`${platform}_handle`];
    return handle ? [{ platform, handle }] : [];
  });
  const website = profile.website_url ?? null;
  if (socials.length === 0 && !website) return null;

  const rel = "noopener noreferrer nofollow ugc";
  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {socials.map(({ platform, handle }) => {
        const Icon = ICONS[platform];
        return (
          <a
            key={platform}
            href={profileLinkUrl(platform, handle)}
            target="_blank"
            rel={rel}
            aria-label={`${SOCIAL_LABELS[platform]}: ${handle}`}
            className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground"
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
      {website && (
        <a
          href={website}
          target="_blank"
          rel={rel}
          className="pressable flex h-10 max-w-[14rem] items-center gap-1.5 rounded-full bg-foreground/[0.07] px-3.5 text-[0.8125rem] font-semibold text-foreground"
        >
          <GlobeIcon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{websiteLabel(website)}</span>
        </a>
      )}
    </div>
  );
}

/** "https://www.scopedtm.com/shop" reads as "scopedtm.com/shop". */
function websiteLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}
