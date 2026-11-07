/** Cleans up what a shop owner types into their listing (0101) before it's
 * saved. Each returns either the value to store or a message to show. */
export type Normalized<T> = { value: T } | { error: string };

export const MAX_SERVICES = 12;
export const MAX_SERVICE_LENGTH = 40;
export const MAX_TAGLINE_LENGTH = 80;

export function normalizeServices(input: string[]): Normalized<string[]> {
  const seen = new Set<string>();
  const services: string[] = [];
  for (const raw of input) {
    const service = raw.trim().replace(/\s+/g, " ");
    if (!service) continue;
    if (service.length > MAX_SERVICE_LENGTH) {
      return { error: `Keep each service under ${MAX_SERVICE_LENGTH} characters.` };
    }
    const key = service.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    services.push(service);
  }
  if (services.length > MAX_SERVICES) return { error: `Add up to ${MAX_SERVICES} services.` };
  return { value: services };
}

export function normalizeTagline(input: string): Normalized<string | null> {
  const tagline = input.trim().replace(/\s+/g, " ");
  if (!tagline) return { value: null };
  if (tagline.length > MAX_TAGLINE_LENGTH) {
    return { error: `Keep the tagline under ${MAX_TAGLINE_LENGTH} characters.` };
  }
  return { value: tagline };
}

export function normalizePhone(input: string): Normalized<string | null> {
  const phone = input.trim().replace(/\s+/g, " ");
  if (!phone) return { value: null };
  if (!/^\+?[\d\s().-]+$/.test(phone)) return { error: "Enter a phone number using digits only." };
  const digits = phone.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15 || phone.length > 30) return { error: "That phone number doesn't look complete." };
  return { value: phone };
}

export function normalizeWebsite(input: string): Normalized<string | null> {
  const trimmed = input.trim();
  if (!trimmed) return { value: null };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { error: "Enter a website like myshop.com." };
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) {
    return { error: "Enter a website like myshop.com." };
  }
  if (withScheme.length > 200) return { error: "That website address is too long." };
  return { value: withScheme };
}

export function normalizeInstagram(input: string): Normalized<string | null> {
  let handle = input.trim();
  if (!handle) return { value: null };
  const fromUrl = handle.match(/instagram\.com\/([^/?#]+)/i);
  if (fromUrl) handle = fromUrl[1];
  handle = handle.replace(/^@/, "");
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return { error: "Enter an Instagram handle like @yourshop." };
  return { value: handle };
}
