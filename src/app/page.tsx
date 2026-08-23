import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (user) redirect("/home");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Your build, documented.
      </h1>
      <p className="mt-4 max-w-md text-balance text-muted">
        REVV is the social platform for your garage — track every mod, share
        your progress, and let people tap the parts in your photos.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/signup">
          <Button>Get started</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Log in</Button>
        </Link>
      </div>

      {!isSupabaseConfigured() && (
        <div className="mt-10 w-full max-w-sm">
          <SupabaseNotConfigured />
        </div>
      )}
    </div>
  );
}
