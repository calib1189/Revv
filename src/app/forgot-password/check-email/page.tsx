import Link from "next/link";

export default function ForgotPasswordCheckEmailPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
      <h1 className="mb-3 text-xl font-semibold">Check your email</h1>
      <p className="text-sm text-muted">
        If an account exists for that email, we sent a link to reset your
        password. Click it, then set a new password.
      </p>
      <Link href="/login" className="mt-6 text-sm text-foreground underline">
        Back to log in
      </Link>
    </div>
  );
}
