import Link from "next/link";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        SORZA
      </Link>
      <h1 className="mb-2 text-xl font-semibold">Reset your password</h1>
      <p className="mb-6 text-sm text-muted">
        Enter the email on your account and we&apos;ll send you a link to
        reset your password.
      </p>

      {isSupabaseConfigured() ? (
        <ForgotPasswordForm />
      ) : (
        <SupabaseNotConfigured />
      )}
    </div>
  );
}
