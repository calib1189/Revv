import { createClient } from "@/lib/supabase/server";
import { listAllParts } from "@/lib/db/parts";
import { AdminPartsClient } from "@/features/admin/admin-parts-client";

export default async function AdminPartsPage() {
  const supabase = await createClient();
  const parts = await listAllParts(supabase);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Parts catalog</h1>
      <AdminPartsClient parts={parts} />
    </div>
  );
}
