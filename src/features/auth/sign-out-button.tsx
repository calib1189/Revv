import { signOut } from "@/features/auth/actions";

/** Settings' sign-out row: a centred full-width action in its own
 * grouped card, the way iOS sets Sign Out apart from everything else. */
export function SignOutButton() {
  return (
    <form action={signOut} className="glass-raised elev-1 overflow-hidden rounded-[22px]">
      <button
        type="submit"
        className="min-h-[48px] w-full px-4 py-3 text-center text-[0.9375rem] font-medium text-accent transition-colors active:bg-foreground/[0.06]"
      >
        Sign Out
      </button>
    </form>
  );
}
