"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { validateUsername } from "@/lib/validation/username";
import { trackEvent } from "@/lib/analytics/track";
import { getProfileByUserId } from "@/lib/db/profiles";
import {
  isUnderSignupRateLimit,
  recordSignupAttempt,
} from "@/lib/auth/signup-rate-limit";
import { getClientIp } from "@/lib/http/get-client-ip";
import { SITE_URL } from "@/lib/site-url";

export interface AuthActionState {
  error: string | null;
}

function friendlyError(message: string): string {
  if (message.toLowerCase().includes("duplicate")) {
    return "That username is already taken.";
  }
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  return message;
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  // Honeypot: a field real users never see or fill (hidden off-screen in
  // the form). A simple bot that fills every input trips this — reject
  // quietly, no hint that anything special happened.
  if (String(formData.get("website") ?? "").length > 0) {
    return { error: "Something went wrong. Try again." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  if (!email) return { error: "Email is required." };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const ip = await getClientIp();
  if (!(await isUnderSignupRateLimit(supabase, ip))) {
    return { error: "Too many signups from this network. Try again later." };
  }
  await recordSignupAttempt(supabase, ip);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { error: friendlyError(error.message) };

  if (data.user) {
    await trackEvent(supabase, data.user.id, "signup");
  }

  redirect("/signup/check-email");
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/feed");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: friendlyError(error.message) };

  if (data.user) {
    const profile = await getProfileByUserId(supabase, data.user.id);
    if (!profile?.onboarded_at) redirect("/welcome");
  }

  redirect(next.startsWith("/") ? next : "/feed");
}

export async function signOut(_formData: FormData): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  // Always redirect to the check-your-email screen, even on failure — this
  // avoids leaking which emails have accounts.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  redirect("/forgot-password/check-email");
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: friendlyError(error.message) };

  redirect("/feed");
}

/** Permanently deletes the signed-in user's account. auth.users -> profiles
 * cascades through every table that references profiles or vehicles (per
 * the schema), so this removes the user's builds, posts, comments, likes,
 * etc. Uses the service-role client because deleting an auth.users row
 * requires the admin API — never exposed to the client, and always scoped
 * to the caller's own session id, never a client-supplied id. */
export async function deleteAccount(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.auth.signOut();
  const admin = createServiceRoleClient();
  await admin.auth.admin.deleteUser(user.id);

  redirect("/");
}

export interface WebHandoffResult {
  url?: string;
  error?: string;
}

/**
 * Apple requires In-App Purchase for anything that unlocks a feature
 * *inside* the app — ad campaigns, shop promotions, and meetup boosts
 * all charge through Stripe directly, which is the wrong side of that
 * line even though what's being sold is real-world visibility, not
 * digital content. Rather than build a second, parallel StoreKit
 * billing path (the "TikTok" approach — real engineering cost, plus
 * Apple's cut on every sale), the native app instead hands the
 * purchase off to the website entirely: this mints a one-time Supabase
 * magic link for the signed-in user and sends them to it in the
 * external system browser, never the app's own WebView, so nothing
 * resembling a purchase flow is ever presented from inside the app —
 * the same pattern Netflix and Spotify use for subscriptions. The
 * checkout itself is never created here; the equivalent web page
 * creates its own draft/session when the person completes the flow
 * there, so a handoff nobody finishes doesn't leave an orphaned
 * pending-payment row behind.
 */
export async function createWebHandoffAction(
  nextPath: string,
): Promise<WebHandoffResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };
  if (!user.email) return { error: "Your account needs a confirmed email." };

  const admin = createServiceRoleClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    // Routed through /auth/callback, not straight to nextPath — that's
    // what actually exchanges the code for a session (see that route);
    // landing directly on nextPath with an un-exchanged code in the URL
    // would leave the browser just as logged-out as before the link was
    // clicked.
    options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(nextPath)}` },
  });
  if (error || !data.properties?.action_link) {
    return { error: "Couldn't open that on the web. Try again." };
  }

  return { url: data.properties.action_link };
}
