"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/billing/stripe";
import { isBillingConfigured } from "@/lib/billing/config";

export interface CheckoutResult {
  error?: string;
}

export async function createCheckoutSessionAction(): Promise<CheckoutResult> {
  if (!isBillingConfigured()) {
    return { error: "Billing isn't set up yet." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You must be logged in." };

  const origin = (await headers()).get("origin");

  let url: string | null;
  try {
    const session = await createCheckoutSession({
      customerEmail: user.email,
      userId: user.id,
      successUrl: `${origin}/settings/billing?success=1`,
      cancelUrl: `${origin}/settings/billing`,
    });
    url = session.url;
  } catch {
    return { error: "Couldn't start checkout. Try again." };
  }

  if (!url) return { error: "Couldn't start checkout. Try again." };
  redirect(url);
}
