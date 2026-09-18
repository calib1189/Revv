import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { AuthCard } from "@/features/auth/auth-card";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      subtitle="Enter the email on your account and we'll send you a link to reset your password."
    >
      {isSupabaseConfigured() ? <ForgotPasswordForm /> : <SupabaseNotConfigured />}
    </AuthCard>
  );
}
