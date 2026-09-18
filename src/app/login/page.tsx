import Image from "next/image";
import Link from "next/link";
import { AuthBackground } from "@/features/auth/auth-background";
import { SignInForm } from "@/features/auth/sign-in-form";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <AuthBackground />
      <div className="animate-section-rise glass-raised elev-3 rounded-[32px] px-6 pb-7 pt-8">
        <Link href="/" className="mb-6 flex justify-center">
          <Image src="/logo-full-v2.png" alt="SORZA" width={140} height={140} quality={100} priority />
        </Link>
        <h1 className="text-center text-[1.75rem] font-bold tracking-[-0.025em]">Welcome back</h1>
        <p className="mb-7 mt-1 text-center text-[0.9375rem] text-muted">Log in to your garage.</p>

        {isSupabaseConfigured() ? (
          <SignInForm next={next} />
        ) : (
          <SupabaseNotConfigured />
        )}
      </div>
    </div>
  );
}
