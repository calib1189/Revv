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
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <AuthBackground />
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
