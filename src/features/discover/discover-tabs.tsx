import Link from "next/link";

export function DiscoverTabs({ active }: { active: "meets" | "leaderboard" }) {
  return (
    <div className="glass mb-4 inline-flex gap-1 rounded-full p-1">
      <Link
        href="/discover"
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          active === "meets"
            ? "bg-accent text-accent-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        Meets
      </Link>
      <Link
        href="/discover/leaderboard"
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          active === "leaderboard"
            ? "bg-accent text-accent-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        Leaderboard
      </Link>
    </div>
  );
}
