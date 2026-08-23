import { createClient } from "@/lib/supabase/server";
import { listPartCategories } from "@/lib/db/parts";
import { PartsBrowser } from "@/features/parts/parts-browser";

export default async function PartsPage() {
  const supabase = await createClient();
  const categories = await listPartCategories(supabase);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Parts</h1>
      <p className="mb-8 text-sm text-muted">
        Browse the verified parts catalog. Link a part to your build from the
        modification form to pull in its specs automatically.
      </p>
      <PartsBrowser categories={categories} />
    </div>
  );
}
