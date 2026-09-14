export interface SoundFormInput {
  title: string;
  artistName: string;
}

export interface SoundFormErrors {
  title?: string;
  artistName?: string;
}

export function validateSoundForm(input: SoundFormInput): SoundFormErrors {
  const errors: SoundFormErrors = {};

  const title = input.title.trim();
  if (title.length < 1) {
    errors.title = "Give this sound a name.";
  } else if (title.length > 80) {
    errors.title = "Name must be 80 characters or fewer.";
  }

  if (input.artistName.trim().length > 80) {
    errors.artistName = "Artist name must be 80 characters or fewer.";
  }

  return errors;
}
