import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { ThemeToggle } from "@/features/settings/theme-toggle";
import { SettingsGroup, SettingsRow } from "@/features/settings/settings-row";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { DeleteAccountButton } from "@/features/auth/delete-account-button";
import {
  BookmarkIcon,
  HeartIcon,
  EyeIcon,
  PersonIcon,
  BellIcon,
  GemIcon,
  ShoppingBagIcon,
  InfoIcon,
  LockIcon,
} from "@/components/ui/icons";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Settings</h1>

      <SettingsGroup label="Your content">
        <SettingsRow
          href="/saved"
          icon={BookmarkIcon}
          label="Saved"
          description="Posts you've bookmarked"
        />
        <SettingsRow
          href="/notifications"
          icon={HeartIcon}
          label="Activity"
          description="Likes, comments, follows, and messages"
        />
        <SettingsRow
          href="/studio"
          icon={EyeIcon}
          label="Creator Studio"
          description="Views, engagement, and how each post is doing"
        />
      </SettingsGroup>

      <section className="mb-7">
        <h2 className="micro-label mb-2.5 px-1 text-muted">Appearance</h2>
        <ThemeToggle />
      </section>

      <SettingsGroup label="Account">
        <SettingsRow
          href="/settings/profile"
          icon={PersonIcon}
          label="Edit profile"
          description="Name, photo, bio"
        />
        <SettingsRow
          href="/settings/notifications"
          icon={BellIcon}
          label="Notifications"
          description="Push notifications for likes, comments, and follows"
        />
      </SettingsGroup>

      <SettingsGroup label="Business">
        <SettingsRow
          href="/advertise"
          icon={GemIcon}
          label="Advertise on SORZA"
          description="Put your shop or brand in front of real builders"
        />
        <SettingsRow
          href="/settings/business"
          icon={ShoppingBagIcon}
          label="Business Profile"
          description="Claim your shop and add photos to its Discover listing"
        />
      </SettingsGroup>

      <SettingsGroup label="Help">
        <SettingsRow
          href="/legal/support"
          icon={InfoIcon}
          label="Support"
          description="Contact us, report a problem, or get help"
        />
        {profile?.is_admin && (
          <SettingsRow
            href="/admin/reports"
            icon={LockIcon}
            label="Admin"
            description="Reports, verifications, ads, audit log, moderation"
            tone="accent"
          />
        )}
      </SettingsGroup>

      <div className="mt-8 border-t border-border pt-6">
        <SignOutButton />
      </div>

      {profile && (
        <div className="mt-8 border-t border-border pt-6">
          <DeleteAccountButton username={profile.username} />
        </div>
      )}
    </div>
  );
}
