import { cookies } from "next/headers";
import {
  createClient as createSupabaseClient,
  isAuthApiError,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  parseAccountStash,
  serializeAccountStash,
  stashAccount,
  unstashAccount,
  type StashedAccount,
} from "@/lib/auth/account-stash";
import { registerDevicePushToken } from "@/lib/db/device-push-tokens";
import { isValidDeviceToken } from "@/lib/push/validation";

// Server-side half of the account switcher. See account-stash.ts for what
// is kept and why; this file is where it touches cookies and Supabase.

const STASH_COOKIE = "sorza-accounts";
// Browsers cap cookie lifetime at 400 days.
const STASH_MAX_AGE_S = 400 * 24 * 60 * 60;

// Supabase's own session cookie: "sb-<project>-auth-token", split into
// ".0", ".1"... chunks when long, plus the PKCE verifier during OAuth.
const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token/;

export async function readAccountStash(): Promise<StashedAccount[]> {
  return parseAccountStash((await cookies()).get(STASH_COOKIE)?.value);
}

export async function writeAccountStash(accounts: StashedAccount[]): Promise<void> {
  const store = await cookies();
  if (accounts.length === 0) {
    store.delete(STASH_COOKIE);
    return;
  }
  store.set(STASH_COOKIE, serializeAccountStash(accounts), {
    // These are live sign-ins for other accounts: page scripts never get
    // to read them, unlike Supabase's own cookie.
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STASH_MAX_AGE_S,
  });
}

/** Leaves this device signed out WITHOUT ending the session on Supabase's
 * side. supabase.auth.signOut() revokes the refresh token, which would
 * make the account just stashed impossible to switch back to. */
export async function clearActiveSessionCookies(): Promise<void> {
  const store = await cookies();
  for (const { name } of store.getAll()) {
    if (SUPABASE_AUTH_COOKIE.test(name)) store.delete(name);
  }
}

export type ResumeResult =
  | { ok: true; session: Session; client: ReturnType<typeof detachedClient> }
  // "expired": Supabase refused the token for good (signed out elsewhere,
  // password changed). "unavailable": couldn't reach it; worth retrying.
  | { ok: false; reason: "expired" | "unavailable" };

/** A client that keeps its session in memory only, so resuming another
 * account never touches the active account's cookies until the caller
 * decides to switch. */
function detachedClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}

/** Trades a stashed refresh token for a fresh session. Supabase rotates
 * the token as it does this, so the stashed one is spent either way and
 * the caller must store the new one (session.refresh_token) if it keeps
 * the account stashed. */
export async function resumeStashedAccount(account: StashedAccount): Promise<ResumeResult> {
  const client = detachedClient();
  try {
    const { data, error } = await client.auth.refreshSession({ refresh_token: account.refreshToken });
    if (error || !data.session) {
      return { ok: false, reason: !error || isAuthApiError(error) ? "expired" : "unavailable" };
    }
    // A cookie only this server writes, but a mismatch would mean signing
    // into an account the switcher didn't show: refuse it.
    if (data.session.user.id !== account.id) {
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      return { ok: false, reason: "expired" };
    }
    return { ok: true, session: data.session, client };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** Best-effort: ends a stashed account's session on Supabase's side, for
 * "Log out of all accounts", so its token is dead rather than just
 * forgotten by this device. */
export async function revokeStashedAccount(account: StashedAccount): Promise<void> {
  const resumed = await resumeStashedAccount(account);
  if (resumed.ok) await resumed.client.auth.signOut({ scope: "local" }).catch(() => {});
}

/** After the active account signs out, opens the next account still
 * signed in on this device, the way Instagram does. Accounts whose
 * session has ended are dropped along the way. Returns whether one was
 * opened. */
export async function resumeNextStashedAccount(
  supabase: SupabaseClient<Database>,
  pushToken?: unknown,
): Promise<boolean> {
  let stash = await readAccountStash();
  for (const account of [...stash]) {
    const resumed = await resumeStashedAccount(account);
    if (!resumed.ok) {
      // A network blip shouldn't cost them a signed-in account.
      if (resumed.reason === "expired") stash = unstashAccount(stash, account.id);
      continue;
    }
    stash = unstashAccount(stash, account.id);
    const { error } = await supabase.auth.setSession({
      access_token: resumed.session.access_token,
      refresh_token: resumed.session.refresh_token,
    });
    if (error) {
      stash = stashAccount(stash, { id: account.id, refreshToken: resumed.session.refresh_token });
      continue;
    }
    await writeAccountStash(stash);
    if (isValidDeviceToken(pushToken)) {
      await registerDevicePushToken(resumed.client, pushToken).catch(() => {});
    }
    return true;
  }
  await writeAccountStash(stash);
  return false;
}
