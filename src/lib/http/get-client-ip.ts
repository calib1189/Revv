import { headers } from "next/headers";

/** Best-effort client IP from proxy headers — used for rate-limiting
 * actions reachable before/without a logged-in user (signup, anonymous
 * marketplace browsing), where a user_id-keyed limit isn't available. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
