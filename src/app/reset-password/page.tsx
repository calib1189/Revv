import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { AuthCard } from "@/features/auth/auth-card";
import { Button } from "@/components/ui/button";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return user ? (
    <AuthCard title="New password" subtitle="Choose a password you haven't used before.">
      <ResetPasswordForm />
    </AuthCard>
  ) : (
    <AuthCard title="Link expired" subtitle="This reset link is invalid or has expired.">
      <Link href="/forgot-password">
        <Button className="h-12 w-full text-[1rem] font-semibold">Request a New Link</Button>
      </Link>
    </AuthCard>
  );
}
