import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthBackground } from "@/features/auth/auth-background";

/** The one frame every sign-in-adjacent screen uses: the looping video
 * backdrop, a raised card with the wordmark, a large centred title and
 * one line of context, then the screen's own content. `icon` swaps the
 * wordmark for a glyph disc on the confirmation screens. */
export function AuthCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <AuthBackground />
      <div className="animate-section-rise glass-raised elev-3 rounded-[32px] px-6 pb-7 pt-8">
        {icon ? (
          <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-accent/12 text-accent [&>svg]:h-7 [&>svg]:w-7">
            {icon}
          </span>
        ) : (
          <Link href="/" className="mb-6 flex justify-center">
            <Image src="/logo-full-v2.png" alt="SORZA" width={140} height={140} quality={100} priority />
          </Link>
        )}
        <h1 className="text-center text-[1.75rem] font-bold leading-tight tracking-[-0.025em]">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 text-center text-[0.9375rem] leading-relaxed text-muted">{subtitle}</p>
        )}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </div>
  );
}

/** An envelope glyph — the icon set has no mail icon. */
export function MailGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
