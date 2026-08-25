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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // RLS already blocks an unauthorized delete (post_hotspots' delete
  // policy requires posts.author_id = auth.uid()), so this couldn't
  // actually succeed for the wrong caller — this check just fails fast
  // with a clear no-op instead of relying entirely on that, and matches
  // createHotspotAction right above it in this same file.
  if (!user) return;
  await deleteHotspot(supabase, hotspotId);
  revalidatePath(`/p/${postId}`);
}
