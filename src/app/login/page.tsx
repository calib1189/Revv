import Link from "next/link";
import { SignInForm } from "@/features/auth/sign-in-form";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex flex-col items-center gap-3 self-center">
        <svg
          width="56"
          height="56"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="192" height="192" rx="42" fill="#050505" stroke="rgba(255,255,255,0.08)" />
          <text
            x="102"
            y="152"
            textAnchor="middle"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="800"
            fontSize="152"
            fill="#ffffff"
          >
            R
          </text>
          <path d="M22 98 L114 86 96 98 114 110 Z" fill="#ff4433" />
          <rect x="22" y="104" width="58" height="5" rx="2.5" fill="#ff4433" opacity="0.85" />
          <rect x="22" y="114" width="40" height="5" rx="2.5" fill="#ff4433" opacity="0.6" />
        </svg>
        <span className="text-xl font-extrabold tracking-tight">
          RE<span className="text-accent">VV</span>
        </span>
      </Link>
      <h1 className="mb-6 text-xl font-semibold">Log in</h1>

      {isSupabaseConfigured() ? (
        <SignInForm next={next} />
      ) : (
        <SupabaseNotConfigured />
      )}
    </div>
  );
}
