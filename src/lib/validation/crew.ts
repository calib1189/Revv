import { isCrewCategory } from "@/lib/crews/category";

export interface CrewFormInput {
  name: string;
  description: string;
  category: string;
  locationText: string;
}

export interface CrewFormErrors {
  name?: string;
  description?: string;
  category?: string;
  locationText?: string;
}

export function validateCrewForm(input: CrewFormInput): CrewFormErrors {
  const errors: CrewFormErrors = {};

  const name = input.name.trim();
  if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > 60) {
    errors.name = "Name must be 60 characters or fewer.";
  }

  if (input.description.trim().length > 1000) {
    errors.description = "Description must be 1000 characters or fewer.";
  }

  if (!isCrewCategory(input.category)) {
    errors.category = "Choose a category.";
  }

  if (input.locationText.trim().length > 200) {
    errors.locationText = "Location must be 200 characters or fewer.";
  }

  return errors;
}
