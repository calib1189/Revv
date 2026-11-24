import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { listVehicleIdsWithGalleryPhotos } from "@/lib/db/vehicle-media";
import { scoreLink } from "@/lib/onboarding/score-link";

/** sorza.net/score — one link for emails and posts that drops a
 * signed-in person into scoring their car (see lib/onboarding/score-link). */
export default async function ScorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/score");

  const supabase = await createClient();
  const vehicles = await listVehiclesByOwner(supabase, user.id);
  const ids = vehicles.map((v) => v.id);
  const [builds, withGalleryPhotos] = await Promise.all([
    listActiveBuildsByVehicleIds(supabase, ids),
    listVehicleIdsWithGalleryPhotos(supabase, ids),
  ]);

  redirect(
    scoreLink(
      vehicles.map((v) => ({
        id: v.id,
        hasPhoto: Boolean(v.hero_media_id) || withGalleryPhotos.has(v.id),
        rated: builds.get(v.id)?.ai_rating_score != null,
      })),
    ),
  );
}
