import Link from "next/link";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        SORZA
      </Link>
      <h1 className="mb-6 text-xl font-semibold">Create your account</h1>

      {isSupabaseConfigured() ? (
        <SignUpForm />
      ) : (
        <SupabaseNotConfigured />
      )}

      <p className="mt-6 text-xs text-muted">
        By creating an account you agree to SORZA&apos;s{" "}
        <Link href="/legal/terms" className="text-accent hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="text-accent hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
