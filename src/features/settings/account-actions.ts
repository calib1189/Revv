"use server";

import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { SITE_URL } from "@/lib/site-url";

export interface AccountFormState {
  error: string | null;
  success: string | null;
}

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Supabase's own wording, turned into something a person can act on. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("reauthentication") || m.includes("reauthenticate")) {
    return "For security, sign out and back in, then change your password.";
  }
  if (m.includes("different from the old")) return "Choose a password you haven't used here before.";
  if (m.includes("already") && m.includes("registered")) return "That email is already used by another account.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries just now. Wait a minute and try again.";
  if (m.includes("weak") || m.includes("password should")) return "Choose a stronger password.";
  return "Couldn't save that. Try again.";
}

/** Starts an email change. Supabase sends a confirmation link; nothing
 * changes until it's opened, so a typo can't lock anyone out. */
export async function changeEmailAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address.", success: null };

  const { supabase, user } = await requireConfirmedUser();
  if (email === user.email?.toLowerCase()) return { error: "That's already your email.", success: null };

  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${SITE_URL}/auth/callback?next=/settings/account` },
  );
  if (error) return { error: friendlyAuthError(error.message), success: null };
  return {
    error: null,
    success: `Check ${email} for a link to confirm the change. Until then, keep signing in with your current email.`,
  };
}

/** Changes the password — or sets one, for an account that so far has
 * only signed in with Apple or Google. */
export async function changePasswordAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.`, success: null };
  }
  if (password !== confirm) return { error: "Those passwords don't match.", success: null };

  const { supabase } = await requireConfirmedUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendlyAuthError(error.message), success: null };
  return { error: null, success: "Password updated." };
}
