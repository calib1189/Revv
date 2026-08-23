import { Callout } from "@/components/ui/callout";

export function SupabaseNotConfigured() {
  return (
    <Callout tone="muted">
      REVV isn&apos;t connected to a Supabase project yet, so accounts can&apos;t
      be created or signed into right now. Add your project URL and anon key
      to <code className="text-foreground">.env.local</code> to enable this.
    </Callout>
  );
}
