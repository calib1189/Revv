import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { AccountForms } from "@/features/settings/account-forms";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings/account");

  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Email & password"
        back={{ href: "/settings", label: "Settings" }}
        description="How you sign in to SORZA."
      />
      <AccountForms currentEmail={user.email ?? null} signsInWithPassword={providers.includes("email")} />
    </PageShell>
  );
}
