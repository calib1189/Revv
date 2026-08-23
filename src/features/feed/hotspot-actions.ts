"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createHotspot, deleteHotspot } from "@/lib/db/hotspots";

export interface CreateHotspotResult {
  error?: string;
}

export async function createHotspotAction(
  postId: string,
  mediaId: string,
  x: number,
  y: number,
  buildPartId: string,
): Promise<CreateHotspotResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  try {
    await createHotspot(supabase, {
      post_id: postId,
      media_id: mediaId,
      x,
      y,
      build_part_id: buildPartId,
    });
  } catch {
    return { error: "Couldn't add that tag." };
  }

  revalidatePath(`/p/${postId}`);
  return {};
}

export async function deleteHotspotAction(
  hotspotId: string,
  postId: string,
): Promise<void> {
  const supabase = await createClient();
  await deleteHotspot(supabase, hotspotId);
  revalidatePath(`/p/${postId}`);
}
