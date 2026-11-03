import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { getAdminQueueCounts } from "@/lib/admin/queue-counts";
import { Avatar } from "@/features/feed/avatar";
import { ThemeToggle } from "@/features/settings/theme-toggle";
import { PlaybackSettings } from "@/features/settings/playback-settings";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { DeleteAccountButton } from "@/features/auth/delete-account-button";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import {
  BookmarkIcon,
  HeartIcon,
  EyeIcon,
  BellIcon,
  BlockIcon,
  GemIcon,
  ShoppingBagIcon,
  InfoIcon,
  LockIcon,
  ChevronRightIcon,
  FlagIcon,
  GlobeIcon,
  PersonIcon,
} from "@/components/ui/icons";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  const avatarMedia = profile?.avatar_media_id
    ? await getMediaById(supabase, profile.avatar_media_id).catch(() => null)
    : null;
  const avatarUrl = avatarMedia ? publicMediaUrl(supabase, avatarMedia.storage_path) : null;
  // How much is waiting on an admin — shown on the Admin row so it's
  // visible from here without opening the dashboard.
  const pendingForAdmin = profile?.is_admin
    ? await getAdminQueueCounts(supabase)
        .then((counts) => counts.total)
        .catch(() => 0)
    : 0;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-6 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Settings</h1>

      <div className="flex flex-col gap-8">
        {/* The account card at the top, the way Settings opens with
            your Apple Account. */}
        {profile && (
          <Link
            href="/settings/profile"
            className="pressable glass-raised elev-1 flex items-center gap-4 rounded-[22px] p-4"
          >
            <Avatar
              username={profile.username}
              avatarUrl={avatarUrl}
              className="h-16 w-16 text-2xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.25rem] font-semibold tracking-[-0.01em]">
                {profile.display_name || `@${profile.username}`}
              </p>
              <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
                @{profile.username} · Name, photo, bio
              </p>
            </div>
            <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
          </Link>
        )}

        {/* First for whoever runs the place, with what's waiting. */}
        {profile?.is_admin && (
          <GroupedList>
            <GroupedRow
              href="/admin"
              label="Admin"
              detail={pendingForAdmin > 0 ? `${pendingForAdmin} waiting on you` : "Everything's reviewed"}
              icon={<RowIcon color="var(--accent)"><LockIcon /></RowIcon>}
              value={
                pendingForAdmin > 0 ? (
                  <span className="numeral rounded-full bg-danger px-2 py-0.5 text-[0.75rem] font-semibold text-white">
                    {pendingForAdmin}
                  </span>
                ) : undefined
              }
            />
          </GroupedList>
        )}

        <section>
          <SectionTitle>Account</SectionTitle>
          <GroupedList>
            <GroupedRow
              href="/settings/account"
              label="Email & password"
              detail={user.email ?? undefined}
              icon={<RowIcon color="#0a84ff"><PersonIcon /></RowIcon>}
            />
            <GroupedRow
              href="/settings/notifications"
              label="Notifications"
              detail="Alerts and which kinds you get"
              icon={<RowIcon color="#ff453a"><BellIcon /></RowIcon>}
            />
            <GroupedRow
              href="/settings/blocked"
              label="Blocked accounts"
              icon={<RowIcon color="#8e8e93"><BlockIcon /></RowIcon>}
            />
          </GroupedList>
        </section>

        <section>
          <SectionTitle>Playback</SectionTitle>
          <PlaybackSettings />
        </section>

        <section>
          <SectionTitle>Appearance</SectionTitle>
          <ThemeToggle />
        </section>

        <section>
          <SectionTitle>Your content</SectionTitle>
          <GroupedList>
            <GroupedRow
              href="/saved"
              label="Saved"
              icon={<RowIcon color="#ff9f0a"><BookmarkIcon /></RowIcon>}
            />
            <GroupedRow
              href="/notifications"
              label="Activity"
              icon={<RowIcon color="#ff375f"><HeartIcon /></RowIcon>}
            />
            <GroupedRow
              href="/studio"
              label="Creator Studio"
              detail="Views and engagement on every post"
              icon={<RowIcon color="#5e5ce6"><EyeIcon /></RowIcon>}
            />
          </GroupedList>
        </section>

        <section>
          <SectionTitle>Business</SectionTitle>
          <GroupedList footer="Claim your shop to add photos to its Discover listing.">
            <GroupedRow
              href="/advertise"
              label="Advertise on SORZA"
              icon={<RowIcon color="#30b0c7"><GemIcon /></RowIcon>}
            />
            <GroupedRow
              href="/settings/business"
              label="Business Profile"
              icon={<RowIcon color="#34c759"><ShoppingBagIcon /></RowIcon>}
            />
          </GroupedList>
        </section>

        <section>
          <SectionTitle>Help & about</SectionTitle>
          <GroupedList>
            <GroupedRow
              href="/legal/support"
              label="Support"
              detail="Questions, problems, feedback"
              icon={<RowIcon color="#8e8e93"><InfoIcon /></RowIcon>}
            />
            <GroupedRow
              href="/legal/guidelines"
              label="Community guidelines"
              icon={<RowIcon color="#ff9f0a"><FlagIcon /></RowIcon>}
            />
            <GroupedRow
              href="/legal/terms"
              label="Terms of use"
              icon={<RowIcon color="#8e8e93"><GlobeIcon /></RowIcon>}
            />
            <GroupedRow
              href="/legal/privacy"
              label="Privacy policy"
              icon={<RowIcon color="#8e8e93"><LockIcon /></RowIcon>}
            />
          </GroupedList>
        </section>

        <div className="flex flex-col gap-4">
          <SignOutButton />
          {profile && <DeleteAccountButton username={profile.username} />}
        </div>
      </div>
    </div>
  );
}
