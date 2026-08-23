import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16 text-center">
      <h1 className="mb-3 text-xl font-semibold">Check your email</h1>
      <p className="text-sm text-muted">
        We sent you a confirmation link. Click it to finish setting up your
        account, then come back and{" "}
        <Link href="/login" className="text-foreground underline">
          log in
        </Link>
        .
      </p>
    </div>
  );
}
