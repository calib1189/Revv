import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        className="whitespace-nowrap px-2 py-1.5 text-xs sm:px-3 sm:text-sm"
      >
        Sign out
      </Button>
    </form>
  );
}
