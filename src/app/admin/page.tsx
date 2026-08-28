import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPlatformTotals } from "@/lib/analytics/queries";

const SECTIONS = [
  {
    href: "/admin/reports",
    label: "Reports",
    description: "User-flagged posts, comments, and profiles waiting on a decision.",
  },
  {
    href: "/admin/verifications",
    label: "Verifications",
    description: "Ownership-verification photos submitted for vehicles.",
  },
  {
    href: "/admin/ads",
    label: "Ads",
    description: "Paid campaigns waiting on review before they go live in the feed.",
  },
  {
    href: "/admin/active",
    label: "Currently active",
    description: "Every ad, shop promotion, and meetup that's live and paid for right now.",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    description: "Platform totals and activity over the last 30 days.",
  },
  {
    href: "/admin/audit-log",
    label: "Audit log",
    description: "Every admin action taken on the platform, in order.",
  },
  {
    href: "/admin/parts",
    label: "Parts catalog",
    description: "The verified parts database backing product cards.",
  },
];

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const totals = await getPlatformTotals(supabase);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mb-6 text-sm text-muted">
        Everything that needs a human decision, plus how the platform&apos;s doing.
      </p>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{totals.profiles}</p>
          <p className="text-xs text-muted">Users</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{totals.vehicles}</p>
          <p className="text-xs text-muted">Vehicles</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-semibold">{totals.posts}</p>
          <p className="text-xs text-muted">Posts</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3.5 transition-colors hover:border-white/20"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{section.label}</p>
              <p className="mt-0.5 text-xs text-muted">{section.description}</p>
            </div>
            <span className="flex-shrink-0 text-muted">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
