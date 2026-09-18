import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PushOptIn } from "@/features/push/push-opt-in";
import { PageHeader, PageShell } from "@/components/ui/page-header";

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/notifications");

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        back={{ href: "/settings", label: "Settings" }}
        description="Get notified even when you're not in the app."
      />
      <PushOptIn />
    </PageShell>
  );
}
