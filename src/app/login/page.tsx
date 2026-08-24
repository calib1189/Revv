import Image from "next/image";
import Link from "next/link";
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
      <Link href="/" className="mb-8 self-center">
        <Image src="/logo.png" alt="REVV" width={88} height={88} priority className="rounded-2xl" />
      </Link>
      <h1 className="mb-6 text-xl font-semibold">Log in</h1>

      {isSupabaseConfigured() ? (
        <SignInForm next={next} />
      ) : (
        <SupabaseNotConfigured />
      )}
    </div>
  );
}
