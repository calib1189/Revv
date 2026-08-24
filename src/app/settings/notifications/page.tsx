import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PushOptIn } from "@/features/push/push-opt-in";

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/notifications");

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link href="/settings" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← Settings
      </Link>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Notifications</h1>
      <p className="mb-8 text-sm text-muted">
        Get notified even when you&apos;re not in the app — likes, comments, new
        followers, and messages.
      </p>
      <PushOptIn />
    </div>
  );
}
