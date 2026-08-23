import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        REVV
      </Link>
      <h1 className="mb-6 text-xl font-semibold">Set a new password</h1>

      {user ? (
        <ResetPasswordForm />
      ) : (
        <p className="text-sm text-muted">
          This reset link is invalid or has expired.{" "}
          <Link href="/forgot-password" className="text-foreground underline">
            Request a new one
          </Link>
          .
        </p>
      )}
    </div>
  );
}
