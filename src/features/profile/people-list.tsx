import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { Profile } from "@/lib/db/profiles";

/** A grouped list of people — avatar, name over @handle, chevron. Used
 * by Friends and Search so every list of accounts in the app reads the
 * same way. Safe in both server and client components. */
export function PeopleList({
  profiles,
  avatarUrlById = {},
}: {
  profiles: Profile[];
  /** profile id → public avatar URL, where the caller has one. */
  avatarUrlById?: Record<string, string | null>;
}) {
  return (
    <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
      {profiles.map((profile, i) => (
        <li key={profile.id} className="relative">
          {i > 0 && <span className="absolute left-[4.5rem] right-0 top-0 h-px bg-border" />}
          <Link
            href={`/u/${profile.username}`}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors active:bg-foreground/[0.06]"
          >
            <Avatar
              username={profile.username}
              avatarUrl={avatarUrlById[profile.id] ?? null}
              className="h-11 w-11 text-base"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-semibold">
                {profile.display_name || profile.username}
              </p>
              <p className="truncate text-[0.8125rem] text-muted">
                @{profile.username}
                {profile.bio ? ` · ${profile.bio}` : ""}
              </p>
            </div>
            <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
