/** What a car is called in notifications: its nickname if it has one,
 * otherwise "2004 BMW M3", falling back to "car" when nothing is filled
 * in. Same rule the post composer uses. */
export function vehicleDisplayName(vehicle: {
  nickname: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  if (vehicle.nickname) return vehicle.nickname;
  const name = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return name || "car";
}
