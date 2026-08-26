import Link from "next/link";

const LINKS = [
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/ads", label: "Ads" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/parts", label: "Parts" },
];

export function AdminNav({ current }: { current: string }) {
  return (
    <div className="flex gap-4 text-sm">
      {LINKS.filter((link) => link.href !== current).map((link) => (
        <Link key={link.href} href={link.href} className="text-accent hover:underline">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
