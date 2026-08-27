import type { ReactElement, SVGProps } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { SupabaseNotConfigured } from "@/components/ui/supabase-not-configured";
import { WrenchIcon, GemIcon, CompassIcon } from "@/components/ui/icons";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

const FEATURES: { icon: IconComponent; title: string; description: string }[] = [
  {
    icon: WrenchIcon,
    title: "Real build data",
    description: "Every mod logged as structured data — part, price, install date — not just a caption.",
  },
  {
    icon: CompassIcon,
    title: "Local car culture",
    description: "Real car meets and local shops — mechanics, tint, body work — happening near you.",
  },
  {
    icon: GemIcon,
    title: "AI-rated builds",
    description: "An AI vision model scores your build 0–100. Climb the tiers from Bronze to Cosmic.",
  },
];

function FeatureHighlight({ icon: Icon, title, description }: (typeof FEATURES)[number]) {
  return (
    <div className="glass flex flex-col gap-2.5 rounded-2xl p-5 text-left">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}

export default async function LandingPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (user) redirect("/feed");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-20 text-center sm:py-28">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        Your build. Documented. Rated. Seen.
      </h1>
      <p className="mt-5 max-w-lg text-balance text-lg text-muted">
        REVV is the social platform built for your garage — log every mod as
        real build data, get an AI-rated score, and find the meets and shops
        happening near you.
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/signup">
          <Button className="px-6 py-2.5 text-base">Get started</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary" className="px-6 py-2.5 text-base">
            Log in
          </Button>
        </Link>
      </div>

      <div className="mt-16 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <FeatureHighlight key={feature.title} {...feature} />
        ))}
      </div>

      {!isSupabaseConfigured() && (
        <div className="mt-10 w-full max-w-sm">
          <SupabaseNotConfigured />
        </div>
      )}
    </div>
  );
}
