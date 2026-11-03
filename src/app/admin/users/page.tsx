import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  listProfilesForAdmin,
  ADMIN_USERS_PAGE_SIZE,
  type AdminUserFilter,
} from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { UserRow, type UserRowData } from "@/features/admin/user-row";
import { FilterChips } from "@/components/ui/segmented-links";
import { SearchIcon, UsersIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/empty-state";

const FILTERS: { value: AdminUserFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "founder", label: "Founder" },
  { value: "banned", label: "Banned" },
  { value: "admins", label: "Admins" },
];

function isFilter(value: string | undefined): value is AdminUserFilter {
  return FILTERS.some((f) => f.value === value);
}

/** Builds a Users URL that keeps whatever else is already chosen. */
function usersHref(params: { q?: string; filter?: AdminUserFilter; page?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const filter: AdminUserFilter = isFilter(params.filter) ? params.filter : "all";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const supabase = await createClient();
  const { profiles, total } = await listProfilesForAdmin(supabase, { query: q, filter, page });

  const avatarIds = profiles.map((p) => p.avatar_media_id).filter((id): id is string => Boolean(id));
  const avatars = await getMediaByIds(supabase, avatarIds).catch(() => []);
  const avatarUrlById = new Map(avatars.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  const rows: UserRowData[] = profiles.map((p) => ({
    userId: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_media_id ? (avatarUrlById.get(p.avatar_media_id) ?? null) : null,
    joinedLabel: new Date(p.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    isVerified: p.is_verified,
    isFounder: p.is_founder,
    isBanned: p.is_banned,
    isAdmin: p.is_admin,
  }));

  const pageCount = Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE));
  const firstShown = total === 0 ? 0 : (page - 1) * ADMIN_USERS_PAGE_SIZE + 1;
  const lastShown = Math.min(total, page * ADMIN_USERS_PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <div className="mb-5">
        <h1 className="text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Users</h1>
        <p className="mt-0.5 text-[0.875rem] text-muted">
          <span className="numeral">{total.toLocaleString("en-US")}</span>{" "}
          {filter === "all" && !q ? (total === 1 ? "account" : "accounts") : total === 1 ? "match" : "matches"}
          {" · "}Grant or remove the Verified badge and Founder title, or ban an account.
        </p>
      </div>

      <form action="/admin/users" className="mb-3">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <label className="glass-raised elev-1 flex items-center gap-2.5 rounded-full px-4">
          <SearchIcon className="h-4 w-4 flex-shrink-0 text-muted" />
          <span className="sr-only">Search users</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by username or name"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-muted"
          />
        </label>
      </form>

      <FilterChips
        className="mb-5"
        options={FILTERS.map((f) => ({
          href: usersHref({ q, filter: f.value }),
          label: f.label,
          active: f.value === filter,
        }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          card
          icon={<UsersIcon />}
          title={q ? `No one matches "${q}"` : "No accounts here"}
          body={q || filter !== "all" ? "Try a different search or filter." : "Accounts show up here as people sign up."}
        />
      ) : (
        <>
          <ul className="glass-raised elev-1 overflow-hidden rounded-[22px]">
            {rows.map((row) => (
              <UserRow key={row.userId} data={row} />
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-3 px-1 text-[0.8125rem] text-muted">
            <span>
              {firstShown.toLocaleString("en-US")}–{lastShown.toLocaleString("en-US")} of{" "}
              {total.toLocaleString("en-US")}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={usersHref({ q, filter, page: page - 1 })}
                    className="pressable rounded-full bg-foreground/[0.08] px-3.5 py-1.5 font-semibold text-foreground"
                  >
                    Previous
                  </Link>
                ) : null}
                {page < pageCount ? (
                  <Link
                    href={usersHref({ q, filter, page: page + 1 })}
                    className="pressable rounded-full bg-foreground/[0.08] px-3.5 py-1.5 font-semibold text-foreground"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
