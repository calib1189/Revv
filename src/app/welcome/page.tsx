import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId, markProfileOnboarded } from "@/lib/db/profiles";
import { ClaimUsernameForm } from "@/features/profile/claim-username-form";
import { PlusIcon, UsersIcon, HomeIcon } from "@/components/ui/icons";

/** Matches the auth.users trigger's fallback username, e.g. "user_a1b2c3d4"
 * — the shape an OAuth signup gets since Google/Apple never collect one. */
const AUTO_USERNAME_PATTERN = /^user_[0-9a-f]{8}$/;

const STEPS = [
  {
    href: "/garage/new",
    icon: PlusIcon,
    title: "Add your car",
    description: "Start your garage — photos, mods, and specs all live here.",
  },
  {
    href: "/search",
    icon: UsersIcon,
    title: "Find people to follow",
    description: "See what other builds look like and get inspired.",
  },
  {
    href: "/feed",
    icon: HomeIcon,
    title: "Browse the feed",
    description: "Scroll through builds and meets from the community.",
  },
] as const;

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/welcome");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);

  try {
    await markProfileOnboarded(supabase, user.id);
  } catch {
    // best-effort — never block the welcome screen on this write
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">
        Welcome to REVV{profile?.username ? `, @${profile.username}` : ""}
      </h1>
      <p className="mt-2 text-sm text-muted">
        The social platform for your build. Here&apos;s where to start.
      </p>

      {profile?.username && AUTO_USERNAME_PATTERN.test(profile.username) && (
        <div className="mt-6">
          <ClaimUsernameForm />
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {STEPS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="glass flex items-center gap-4 rounded-2xl p-4 transition-opacity hover:opacity-90"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-muted">{description}</span>
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/feed"
        className="mt-8 text-center text-sm text-muted hover:text-foreground"
      >
        Skip for now
      </Link>
    </div>
  );
}
