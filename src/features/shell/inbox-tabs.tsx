import Link from "next/link";

export function InboxTabs({ current }: { current: "messages" | "activity" }) {
  return (
    <div className="glass mb-6 inline-flex rounded-full p-1">
      <Link
        href="/messages"
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          current === "messages"
            ? "bg-accent text-accent-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        Messages
      </Link>
      <Link
        href="/notifications"
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
          current === "activity"
            ? "bg-accent text-accent-foreground"
            : "text-muted hover:text-foreground"
        }`}
      >
        Activity
      </Link>
    </div>
  );
}
