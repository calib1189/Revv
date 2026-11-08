import { timingSafeEqual } from "node:crypto";

/** Scheduled jobs (Vercel Cron, Supabase pg_cron) call with
 * `Authorization: Bearer $CRON_SECRET`. With no CRON_SECRET set, nothing
 * can call them: anyone who found the URL could otherwise trigger pushes
 * to every user. */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
