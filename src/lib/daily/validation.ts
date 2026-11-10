export const MAX_CAPTION = 150;
export const MAX_CHALLENGE_TITLE = 60;
export const MAX_CHALLENGE_DESCRIPTION = 280;

type Result<T> = { value: T } | { error: string };

export function normalizeCaption(input: string): Result<string | null> {
  const caption = input.trim().replace(/\s+/g, " ");
  if (!caption) return { value: null };
  if (caption.length > MAX_CAPTION) return { error: `Keep your caption under ${MAX_CAPTION} characters.` };
  return { value: caption };
}

export function normalizeChallengeText(input: {
  title: string;
  description: string;
}): Result<{ title: string; description: string }> {
  const title = input.title.trim().replace(/\s+/g, " ");
  const description = input.description.trim();
  if (!title) return { error: "Give the challenge a title." };
  if (title.length > MAX_CHALLENGE_TITLE) return { error: `Keep the title under ${MAX_CHALLENGE_TITLE} characters.` };
  if (!description) return { error: "Add a short description." };
  if (description.length > MAX_CHALLENGE_DESCRIPTION) {
    return { error: `Keep the description under ${MAX_CHALLENGE_DESCRIPTION} characters.` };
  }
  return { value: { title, description } };
}

export const MAX_SPONSOR_NAME = 60;
export const MAX_SPONSOR_URL = 300;
export const MAX_PRIZE = 120;

export interface SponsorFields {
  name: string | null;
  url: string | null;
  logoMediaId: string | null;
  prize: string | null;
}

/** A day's sponsor and prize, as an admin typed them. All blank means an
 * ordinary day. A prize can stand alone (SORZA's own prize days); a link
 * or logo needs a sponsor name to go with it. Links must be https, and a
 * bare "shop.com" gets https:// added. */
export function normalizeSponsor(input: {
  name: string;
  url: string;
  logoMediaId: string | null;
  prize: string;
}): Result<SponsorFields> {
  const name = input.name.trim().replace(/\s+/g, " ") || null;
  const prize = input.prize.trim().replace(/\s+/g, " ") || null;
  let url = input.url.trim() || null;
  const logoMediaId = input.logoMediaId || null;

  if (name && name.length > MAX_SPONSOR_NAME) return { error: `Keep the sponsor name under ${MAX_SPONSOR_NAME} characters.` };
  if (prize && prize.length > MAX_PRIZE) return { error: `Keep the prize under ${MAX_PRIZE} characters.` };
  if (!name && (url || logoMediaId)) return { error: "Add the sponsor's name to go with their link or logo." };
  if (url) {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { error: "That sponsor link doesn't look right." };
    }
    if (parsed.protocol !== "https:" || !parsed.hostname.includes(".")) {
      return { error: "Sponsor links need to start with https://." };
    }
    if (url.length > MAX_SPONSOR_URL) return { error: "That sponsor link is too long." };
  }
  return { value: { name, url, logoMediaId, prize } };
}
