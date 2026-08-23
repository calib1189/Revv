import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" className="px-3 py-1.5 text-sm">
        Sign out
      </Button>
    </form>
  );
}
