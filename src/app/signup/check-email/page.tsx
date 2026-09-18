import Link from "next/link";
import { AuthCard, MailGlyph } from "@/features/auth/auth-card";
import { Button } from "@/components/ui/button";

export default function CheckEmailPage() {
  return (
    <AuthCard
      icon={<MailGlyph />}
      title="Check your email"
      subtitle="We sent you a confirmation link. Open it to finish setting up your account, then log in."
    >
      <Link href="/login">
        <Button className="h-12 w-full text-[1rem] font-semibold">Log In</Button>
      </Link>
    </AuthCard>
  );
}
