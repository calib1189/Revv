"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { PlusIcon, TrashIcon } from "@/components/ui/icons";
import { PART_CATEGORIES } from "@/lib/parts/categories";
import { specsToRows } from "@/lib/parts/specs";
import type { Part } from "@/lib/db/parts";
import type { PartFormState } from "@/features/admin/parts-actions";

const initialState: PartFormState = { error: null };

interface EditableRow {
  id: string;
  key: string;
  value: string;
}

export function PartForm({
  action,
  part,
  submitLabel,
  onSuccess,
  onCancel,
}: {
  action: (prevState: PartFormState, formData: FormData) => Promise<PartFormState>;
  part?: Part;
  submitLabel: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const wasPending = useRef(false);
  // Each row needs a stable id independent of its position — array-index
  // keys would make an uncontrolled input's on-screen value follow the
  // wrong row's content after removing a row from the middle of the list.
  const [rows, setRows] = useState<EditableRow[]>(() =>
    specsToRows(part?.specs ?? {}).map((row) => ({ id: crypto.randomUUID(), ...row })),
  );

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onSuccess?.();
    }
    wasPending.current = isPending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, state.error]);

  return (
    <form action={formAction} className="glass flex flex-col gap-4 rounded-2xl p-4">
      {state.error && <Callout tone="danger">{state.error}</Callout>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input id="brand" name="brand" defaultValue={part?.brand ?? ""} required />
        </div>
        <div>
          <Label htmlFor="product">Product</Label>
          <Input id="product" name="product" defaultValue={part?.product ?? ""} required />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue={part?.category ?? ""}
            required
            className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent/60 focus:outline-none"
          >
            <option value="" disabled>
              Choose a category
            </option>
            {PART_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="partNumber">Part number</Label>
          <Input id="partNumber" name="partNumber" defaultValue={part?.part_number ?? ""} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            name="source"
            placeholder="Manufacturer spec sheet, product page URL…"
            defaultValue={part?.source ?? ""}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="mb-0">Specs</Label>
          <button
            type="button"
            onClick={() =>
              setRows((r) => [...r, { id: crypto.randomUUID(), key: "", value: "" }])
            }
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add spec
          </button>
        </div>
        {rows.length === 0 && (
          <p className="text-xs text-muted">
            Optional, but helpful — size, offset, material, whatever&rsquo;s specific to this part.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <Input name="specKey" placeholder="Key (e.g. offset)" defaultValue={row.key} className="flex-1" />
              <Input
                name="specValue"
                placeholder="Value (e.g. +35mm)"
                defaultValue={row.value}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((x) => x.id !== row.id))}
                aria-label="Remove spec"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-muted hover:text-danger"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="verified"
          defaultChecked={part?.verified ?? false}
          className="h-4 w-4"
        />
        Verified — I&rsquo;ve confirmed this data is accurate
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="self-start">
          {isPending ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
