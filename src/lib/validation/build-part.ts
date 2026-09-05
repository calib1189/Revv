export interface BuildPartFormInput {
  rawName: string;
  price: string;
  installCost: string;
  ownerAffiliateUrl: string;
}

export interface BuildPartFormErrors {
  rawName?: string;
  price?: string;
  installCost?: string;
  ownerAffiliateUrl?: string;
}

/** Strips common currency formatting ($ prefix, thousands commas) so
 * "$1,500" and "1500" both parse the same way. */
export function parseMoneyInput(value: string): number {
  return Number(value.trim().replace(/[$,]/g, ""));
}

function validateMoneyField(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const dollars = parseMoneyInput(value);
  if (!Number.isFinite(dollars) || dollars < 0) {
    return "Must be a positive number.";
  }
  return undefined;
}

/** Only checked for shape (a real http(s) URL) — SORZA never verifies
 * this actually is the owner's own affiliate account, the same way it
 * doesn't verify any other free-text field. It's their link; they're
 * the one who gets paid or doesn't. */
function validateOwnerAffiliateUrl(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Must be a link starting with https://.";
    }
  } catch {
    return "Must be a valid link starting with https://.";
  }
  return undefined;
}

export function validateBuildPartForm(
  input: BuildPartFormInput,
): BuildPartFormErrors {
  const errors: BuildPartFormErrors = {};

  if (!input.rawName.trim()) {
    errors.rawName = "Name is required.";
  } else if (input.rawName.trim().length > 200) {
    errors.rawName = "Name must be 200 characters or fewer.";
  }

  errors.price = validateMoneyField(input.price);
  errors.installCost = validateMoneyField(input.installCost);
  errors.ownerAffiliateUrl = validateOwnerAffiliateUrl(input.ownerAffiliateUrl);

  return errors;
}

export function dollarsToCents(value: string): number | null {
  if (!value.trim()) return null;
  return Math.round(parseMoneyInput(value) * 100);
}
