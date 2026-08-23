import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { Button } from "@/components/ui/button";

export async function Header() {
  const user = await getCurrentUser();
  let username: string | null = null;

  if (user) {
    const supabase = await createClient();
    const profile = await getProfileByUserId(supabase, user.id);
    username = profile?.username ?? null;
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          REVV
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <Link
              href="/garage"
              className="text-sm font-medium text-foreground hover:text-muted"
            >
              Garage
            </Link>
            <span className="text-sm text-muted">
              {username ? `@${username}` : user.email}
            </span>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" className="px-3 py-1.5 text-sm">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="px-3 py-1.5 text-sm">Sign up</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
