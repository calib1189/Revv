export interface BuildPartFormInput {
  rawName: string;
  price: string;
  installCost: string;
}

export interface BuildPartFormErrors {
  rawName?: string;
  price?: string;
  installCost?: string;
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

  return errors;
}

export function dollarsToCents(value: string): number | null {
  if (!value.trim()) return null;
  return Math.round(parseMoneyInput(value) * 100);
}
