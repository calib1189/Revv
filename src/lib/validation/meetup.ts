export interface MeetupFields {
  title: string;
  locationName: string;
  startsAt: string;
}

export function validateMeetup(fields: MeetupFields): string | null {
  const title = fields.title.trim();
  if (title.length === 0) return "Give it a title.";
  if (title.length > 120) return "Title must be 120 characters or fewer.";

  const locationName = fields.locationName.trim();
  if (locationName.length === 0) return "Add a location.";
  if (locationName.length > 200) return "Location must be 200 characters or fewer.";

  if (!fields.startsAt) return "Pick a date and time.";
  const startsAt = new Date(fields.startsAt);
  if (Number.isNaN(startsAt.getTime())) return "That date and time isn't valid.";
  if (startsAt.getTime() < Date.now() - 60 * 60 * 1000) {
    return "Pick a time that hasn't already passed.";
  }

  return null;
}
