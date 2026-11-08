import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { PushOptIn } from "@/features/push/push-opt-in";
import { NotificationPreferencesList } from "@/features/push/notification-preferences-list";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/grouped-list";
import { Callout } from "@/components/ui/callout";
import {
  getNotificationPreferences,
  getQuietHours,
  type NotificationPreferences,
} from "@/lib/db/notification-preferences";
import { QuietHoursSettings } from "@/features/push/quiet-hours-settings";

export default async function NotificationSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/notifications");

  // Null when the preferences table (0094) isn't there yet — the
  // switches are left out rather than shown in a state they can't save.
  let preferences: NotificationPreferences | null = null;
  const supabase = await createClient();
  try {
    preferences = await getNotificationPreferences(supabase, user.id);
  } catch {
    preferences = null;
  }
  const quiet = await getQuietHours(supabase, user.id);

  return (
    <PageShell>
      <PageHeader
        title="Notifications"
        back={{ href: "/settings", label: "Settings" }}
        description="Get notified even when you're not in the app."
      />
      <PushOptIn />

      <section className="mt-8">
        <SectionTitle>Notify me about</SectionTitle>
        {preferences ? (
          <NotificationPreferencesList initial={preferences} />
        ) : (
          <Callout tone="muted">Choosing which notifications you get isn&apos;t available right now.</Callout>
        )}
      </section>

      {preferences && (
        <section className="mt-8">
          <SectionTitle>Quiet hours</SectionTitle>
          <QuietHoursSettings initial={quiet} />
        </section>
      )}
    </PageShell>
  );
}
