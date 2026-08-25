import type { Json } from "@/lib/supabase/database.types";

export interface SpecRow {
  key: string;
  value: string;
}

/** parts.specs is a free-form jsonb map (brand-defined keys, no fixed
 * shape) — these convert between that and the flat, ordered key/value
 * rows the admin form actually edits, since a plain JSON textarea is a
 * much worse editing experience and a raw object has no stable row
 * order to drive a dynamic add/remove-row UI from. */
export function specsToRows(specs: Json): SpecRow[] {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return [];
  return Object.entries(specs as Record<string, Json>).map(([key, value]) => ({
    key,
    value: value == null ? "" : String(value),
  }));
}

export function rowsToSpecs(rows: SpecRow[]): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    specs[key] = row.value.trim();
  }
  return specs;
}
