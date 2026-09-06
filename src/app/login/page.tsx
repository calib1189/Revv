import Image from "next/image";
import Link from "next/link";
import { AuthBackground } from "@/features/auth/auth-background";
import { SignInForm } from "@/features/auth/sign-in-form";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/server";
import { listTopRatedBuilds } from "@/lib/db/builds";
import { composeLeaderboard } from "@/lib/leaderboard/compose-leaderboard";

/** A handful of real hero photos from the app's own top-rated builds,
 * for the login page backdrop — never mock/placeholder imagery (CLAUDE.md:
 * never present mock output as real). Best-effort only: an empty/failed
 * result just means AuthBackground renders a plain dark background
 * instead, never a broken login page. */
async function getBackgroundPhotos(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const builds = await listTopRatedBuilds(supabase, 8);
    const entries = await composeLeaderboard(supabase, builds);
    return entries
      .map((e) => e.heroUrl)
      .filter((url): url is string => Boolean(url))
      .slice(0, 6);
  } catch (err) {
    console.error("Login background photo fetch failed:", err);
    return [];
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const photos = isSupabaseConfigured() ? await getBackgroundPhotos() : [];

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <AuthBackground photos={photos} />
      <div className="glass-raised rounded-3xl px-6 py-8">
        <Link href="/" className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="SORZA" width={112} height={112} quality={100} priority />
        </Link>
        <h1 className="mb-6 text-xl font-semibold">Log in</h1>

        {isSupabaseConfigured() ? (
          <SignInForm next={next} />
        ) : (
          <SupabaseNotConfigured />
        )}
      </div>
    </div>
  );
}
