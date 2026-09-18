import Link from "next/link";
import { AuthCard, MailGlyph } from "@/features/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordCheckEmailPage() {
  return (
    <AuthCard
      icon={<MailGlyph />}
      title="Check your email"
      subtitle="If an account exists for that email, we sent a link to reset your password. Open it, then set a new one."
    >
      <Link href="/login">
        <Button variant="secondary" className="h-12 w-full text-[1rem] font-semibold">
          Back to Log In
        </Button>
      </Link>
    </AuthCard>
  );
}
