import Image from "next/image";
import Link from "next/link";
import { AuthBackground } from "@/features/auth/auth-background";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <AuthBackground />
      <div className="animate-section-rise glass-raised elev-3 rounded-[32px] px-6 pb-7 pt-8">
        <Link href="/" className="mb-6 flex justify-center">
          <Image src="/logo-full-v2.png" alt="SORZA" width={140} height={140} quality={100} priority />
        </Link>
        <h1 className="text-center text-[1.75rem] font-bold tracking-[-0.025em]">Create your account</h1>
        <p className="mb-7 mt-1 text-center text-[0.9375rem] text-muted">Log your build. Get it rated.</p>

        {isSupabaseConfigured() ? <SignUpForm /> : <SupabaseNotConfigured />}

        <p className="mt-6 text-center text-[0.75rem] leading-relaxed text-muted">
          By creating an account you agree to SORZA&apos;s{" "}
          <Link href="/legal/terms" className="font-medium text-accent">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="font-medium text-accent">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
