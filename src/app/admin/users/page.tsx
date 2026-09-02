import { createClient } from "@/lib/supabase/server";
import { searchProfilesByUsername } from "@/lib/db/profiles";
import { UserRow, type UserRowData } from "@/features/admin/user-row";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const profiles = q ? await searchProfilesByUsername(supabase, q) : [];

  const rows: UserRowData[] = profiles.map((p) => ({
    userId: p.id,
    username: p.username,
    isVerified: p.is_verified,
    isFounder: p.is_founder,
    isBanned: p.is_banned,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Users</h1>
      <p className="mb-6 text-sm text-muted">
        Grant or revoke the Verified checkmark and the Founder &amp; Owner title. Neither
        is self-service — this admin panel is the only place either can be changed.
      </p>

      <form className="mb-6 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by username"
          className="glass-inset w-full rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          className="flex-shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          Search
        </button>
      </form>

      {!q ? (
        <p className="text-sm text-muted">Search for a username to manage their badges.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No users match &quot;{q}&quot;.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <UserRow key={row.userId} data={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
