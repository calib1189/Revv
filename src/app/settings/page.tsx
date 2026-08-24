import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { ThemeToggle } from "@/features/settings/theme-toggle";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { DeleteAccountButton } from "@/features/auth/delete-account-button";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="mb-8">
        <p className="mb-2 text-sm font-medium">Appearance</p>
        <ThemeToggle />
      </div>

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
        <Link
          href="/settings/profile"
          className="flex flex-col gap-0.5 px-4 py-3.5 transition-opacity hover:opacity-80"
        >
          <span className="text-sm font-medium">Edit profile</span>
          <span className="text-xs text-muted">Name, photo, bio</span>
        </Link>
        <Link
          href="/settings/notifications"
          className="flex flex-col gap-0.5 px-4 py-3.5 transition-opacity hover:opacity-80"
        >
          <span className="text-sm font-medium">Notifications</span>
          <span className="text-xs text-muted">Push notifications for likes, comments, follows, and messages</span>
        </Link>
        <Link
          href="/settings/billing"
          className="flex flex-col gap-0.5 px-4 py-3.5 transition-opacity hover:opacity-80"
        >
          <span className="text-sm font-medium">Billing</span>
          <span className="text-xs text-muted">Manage your subscription</span>
        </Link>
      </div>

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
