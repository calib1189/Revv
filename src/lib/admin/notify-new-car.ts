import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPushToUser } from "@/lib/push/send";

/** Whether a car just joined the admin approval queue: it has a photo
 * now, didn't before, and hasn't been approved or rejected. Same rule as
 * listVehiclesAwaitingApproval, applied to the one change that happened. */
export function joinsApprovalQueue({
  hadPhoto,
  hasPhoto,
  status,
}: {
  hadPhoto: boolean;
  hasPhoto: boolean;
  status: string;
}): boolean {
  return !hadPhoto && hasPhoto && (status === "none" || status === "pending");
}

/** The push an admin gets for a new car to approve. */
export function newCarPush(car: { year: number | null; make: string | null; model: string | null }, username: string | null) {
  const name = [car.year, car.make, car.model].filter(Boolean).join(" ") || "a car";
  return {
    title: "New car to approve",
    body: username ? `@${username} added ${name}` : `Someone added ${name}`,
    url: "/admin/verifications",
  };
}

/** Pushes every admin (iPhone app and browsers they've turned push on
 * in) that a car is waiting for approval. Best-effort: never throws, so a
 * push problem can't fail adding the car. An admin isn't pushed about
 * their own car. */
export async function notifyAdminsOfNewCar(vehicle: {
  owner_id: string;
  year: number | null;
  make: string | null;
  model: string | null;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    const [{ data: admins }, { data: owner }] = await Promise.all([
      supabase.from("profiles").select("id").eq("is_admin", true),
      supabase.from("profiles").select("username").eq("id", vehicle.owner_id).maybeSingle(),
    ]);
    const payload = newCarPush(vehicle, owner?.username ?? null);
    await Promise.allSettled(
      (admins ?? [])
        .filter((a) => a.id !== vehicle.owner_id)
        .map((a) => sendPushToUser(a.id, payload, "updates")),
    );
  } catch {
    // No service-role key in this environment, most likely. Adding the
    // car still worked; the queue badge in Admin still shows it.
  }
}
