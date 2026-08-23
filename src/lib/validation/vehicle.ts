export interface VehicleFormInput {
  year: string;
  make: string;
  model: string;
  mileage: string;
}

export interface VehicleFormErrors {
  year?: string;
  make?: string;
  model?: string;
  mileage?: string;
}

export function validateVehicleForm(
  input: VehicleFormInput,
  now: Date = new Date(),
): VehicleFormErrors {
  const errors: VehicleFormErrors = {};

  if (!input.make.trim()) errors.make = "Make is required.";
  if (!input.model.trim()) errors.model = "Model is required.";

  if (input.year.trim()) {
    const year = Number(input.year);
    const maxYear = now.getFullYear() + 1;
    if (!Number.isInteger(year) || year < 1900 || year > maxYear) {
      errors.year = `Year must be between 1900 and ${maxYear}.`;
    }
  } else {
    errors.year = "Year is required.";
  }

  if (input.mileage.trim()) {
    const mileage = Number(input.mileage);
    if (!Number.isInteger(mileage) || mileage < 0) {
      errors.mileage = "Mileage must be a positive number.";
    }
  }

  return errors;
}
