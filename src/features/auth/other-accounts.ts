import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { canAddAccount } from "@/lib/auth/account-stash";
import { readAccountStash } from "@/lib/auth/account-switching";

/** What the switcher shows for one account. No tokens: this goes to the
 * browser. */
export interface SwitchableAccount {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface OtherAccounts {
  accounts: SwitchableAccount[];
  canAdd: boolean;
}

/** The accounts signed in on this device besides `activeId`, most
 * recently used first. Profiles are public, so this works signed out too
 * (the "Back to @name" link on the add-account login screen). */
export async function listOtherAccounts(
  supabase: SupabaseClient<Database>,
  activeId: string | null,
): Promise<OtherAccounts> {
  const stash = await readAccountStash();
  const others = stash.filter((a) => a.id !== activeId);
  const canAdd = canAddAccount(stash, activeId);
  if (others.length === 0) return { accounts: [], canAdd };

  try {
    const profiles = await getProfilesByIds(
      supabase,
      others.map((a) => a.id),
    );
    const avatarIds = profiles.flatMap((p) => (p.avatar_media_id ? [p.avatar_media_id] : []));
    const media = await getMediaByIds(supabase, avatarIds).catch(() => []);
    const urlByMediaId = new Map(media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
    const byId = new Map(profiles.map((p) => [p.id, p]));

    // Stash order, and an account whose profile is gone (deleted) is left
    // out rather than shown blank.
    const accounts = others.flatMap((a) => {
      const profile = byId.get(a.id);
      if (!profile) return [];
      return [
        {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_media_id ? (urlByMediaId.get(profile.avatar_media_id) ?? null) : null,
        },
      ];
    });
    return { accounts, canAdd };
  } catch {
    return { accounts: [], canAdd };
  }
}
