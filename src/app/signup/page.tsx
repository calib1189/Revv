import Link from "next/link";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignUpPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        REVV
      </Link>
      <h1 className="mb-6 text-xl font-semibold">Create your account</h1>

      {isSupabaseConfigured() ? (
        <SignUpForm />
      ) : (
        <SupabaseNotConfigured />
      )}
    </div>
  );
}
