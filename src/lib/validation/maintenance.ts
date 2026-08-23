export interface MaintenanceFormInput {
  kind: string;
  performedAt: string;
  mileage: string;
  cost: string;
}

export interface MaintenanceFormErrors {
  kind?: string;
  performedAt?: string;
  mileage?: string;
  cost?: string;
}

export function validateMaintenanceForm(
  input: MaintenanceFormInput,
): MaintenanceFormErrors {
  const errors: MaintenanceFormErrors = {};

  if (!input.kind.trim()) errors.kind = "Service type is required.";
  if (!input.performedAt.trim()) errors.performedAt = "Date is required.";

  if (input.mileage.trim()) {
    const mileage = Number(input.mileage);
    if (!Number.isInteger(mileage) || mileage < 0) {
      errors.mileage = "Mileage must be a positive number.";
    }
  }

  if (input.cost.trim()) {
    const cost = Number(input.cost);
    if (!Number.isFinite(cost) || cost < 0) {
      errors.cost = "Cost must be a positive number.";
    }
  }

  return errors;
}
