import Image from "next/image";
import Link from "next/link";
import { AuthBackground } from "@/features/auth/auth-background";
import { SignInForm } from "@/features/auth/sign-in-form";
import { BackToAccountButton } from "@/features/auth/account-switcher";
import { listOtherAccounts } from "@/features/auth/other-accounts";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; add?: string }>;
}) {
  const { next, add } = await searchParams;
  const configured = isSupabaseConfigured();

  // Reached from "Add account": the account they came from is set aside,
  // not signed out, so offer the way back.
  const addingAccount = add === "1" && configured;
  const previous =
    addingAccount && !(await getCurrentUser())
      ? (await listOtherAccounts(await createClient(), null)).accounts[0]
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <AuthBackground />
      <div className="animate-section-rise glass-raised elev-3 rounded-[32px] px-6 pb-7 pt-8">
        <Link href="/" className="mb-6 flex justify-center">
          <Image src="/logo-full-v2.png" alt="SORZA" width={140} height={140} quality={100} priority />
        </Link>
        <h1 className="text-center text-[1.75rem] font-bold tracking-[-0.025em]">
          {addingAccount ? "Add an account" : "Welcome back"}
        </h1>
        <p className="mb-7 mt-1 text-center text-[0.9375rem] text-muted">
          {addingAccount
            ? "Log in to another garage. You'll stay signed in to both."
            : "Log in to your garage."}
        </p>

        {configured ? (
          <SignInForm next={next} />
        ) : (
          <SupabaseNotConfigured />
        )}

        {previous && <BackToAccountButton account={previous} />}
      </div>
    </div>
  );
}
