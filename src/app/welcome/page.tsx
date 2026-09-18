import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId, markProfileOnboarded } from "@/lib/db/profiles";
import { ClaimUsernameForm } from "@/features/profile/claim-username-form";
import { PlusIcon, UsersIcon, HomeIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-14">
      {/* iOS "Welcome / What's New" sheet: big centred title, a short
          list of icon-led rows, one primary action at the bottom. */}
      <h1 className="animate-section-rise text-balance text-center text-[2.25rem] font-bold leading-[1.1] tracking-[-0.03em]">
        Welcome to <span className="text-accent">SORZA</span>
      </h1>
      <p className="mt-3 text-center text-[1rem] text-muted">
        {profile?.username ? `You're in, @${profile.username}. ` : ""}Here&apos;s where to start.
      </p>

      {profile?.username && AUTO_USERNAME_PATTERN.test(profile.username) && (
        <div className="glass-raised elev-1 mt-8 rounded-[22px] p-5">
          <ClaimUsernameForm />
        </div>
      )}

      <div className="mt-10 flex flex-col gap-7">
        {STEPS.map(({ href, icon: Icon, title, description }, i) => (
          <Link
            key={href}
            href={href}
            className="animate-section-rise flex items-start gap-4"
            style={{ animationDelay: `${120 + i * 80}ms` }}
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] bg-accent text-accent-foreground elev-2">
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[1rem] font-semibold">{title}</span>
              <span className="mt-0.5 block text-[0.875rem] leading-snug text-muted">{description}</span>
            </span>
          </Link>
        ))}
      </div>

      <Link href="/garage/new" className="mt-12">
        <Button className="h-12 w-full text-[1rem] font-semibold">Add Your Car</Button>
      </Link>
      <Link href="/feed" className="mt-4 text-center text-[0.9375rem] font-medium text-accent">
        Skip for Now
      </Link>
    </div>
  );
}
