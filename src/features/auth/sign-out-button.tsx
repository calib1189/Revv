import { signOut } from "@/features/auth/actions";
import { signOutAllAccountsAction } from "@/features/auth/account-actions";
import { PushTokenField } from "@/features/push/push-token-field";

/** Settings' sign-out rows: centred full-width actions in their own
 * grouped card, the way iOS sets Sign Out apart from everything else.
 * With other accounts on this device, signing out opens the next one,
 * and a second row signs out of all of them. */
export function SignOutButton({
  username,
  hasOtherAccounts = false,
}: {
  username?: string | null;
  hasOtherAccounts?: boolean;
}) {
  const rowClass =
    "min-h-[48px] w-full px-4 py-3 text-center text-[0.9375rem] font-medium text-accent transition-colors active:bg-foreground/[0.06]";
  return (
    <div className="glass-raised elev-1 overflow-hidden rounded-[22px]">
      <form action={signOut}>
        <PushTokenField />
        <button type="submit" className={rowClass}>
          {hasOtherAccounts && username ? `Sign Out of @${username}` : "Sign Out"}
        </button>
      </form>
      {hasOtherAccounts && (
        <form action={signOutAllAccountsAction} className="border-t border-border">
          <PushTokenField />
          <button type="submit" className={rowClass}>
            Sign Out of All Accounts
          </button>
        </form>
      )}
    </div>
  );
}
