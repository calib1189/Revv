"use client";

import { useState } from "react";
import { createHotspotAction, deleteHotspotAction } from "@/features/feed/hotspot-actions";
import { ProductCard } from "@/features/builds/product-card";
import { formatCents } from "@/lib/format/money";
import type { BuildPart } from "@/lib/db/build-parts";
import type { Part } from "@/lib/db/parts";

export interface HotspotWithInfo {
  id: string;
  x: number;
  y: number;
  buildPart: BuildPart;
  linkedPart: Part | null;
}

function HotspotDot({
  hotspot,
  postId,
  isOwner,
}: {
  hotspot: HotspotWithInfo;
  postId: string;
  isOwner: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        aria-label={`View tag: ${hotspot.buildPart.raw_name}`}
        className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-black/50 shadow-lg backdrop-blur-sm"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-raised absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-2xl p-3"
        >
          <p className="text-sm font-medium">{hotspot.buildPart.raw_name}</p>
          {hotspot.buildPart.price_cents != null && (
            <p className="text-xs text-muted">
              {formatCents(hotspot.buildPart.price_cents)}
            </p>
          )}
          {hotspot.linkedPart && (
            <div className="mt-2">
              <ProductCard part={hotspot.linkedPart} />
            </div>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={() => deleteHotspotAction(hotspot.id, postId)}
              className="mt-2 text-xs text-danger hover:underline"
            >
              Remove tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HotspotLayer({
  postId,
  mediaId,
  hotspots,
  isOwner,
  isTagging,
  availableParts,
}: {
  postId: string;
  mediaId: string;
  hotspots: HotspotWithInfo[];
  isOwner: boolean;
  isTagging: boolean;
  availableParts: BuildPart[];
}) {
  const [pending, setPending] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isTagging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPending({ x, y });
  }

  async function handleAssign(buildPartId: string) {
    if (!pending) return;
    setIsSaving(true);
    await createHotspotAction(postId, mediaId, pending.x, pending.y, buildPartId);
    setIsSaving(false);
    setPending(null);
  }

  return (
    <div
      className={`absolute inset-0 ${isTagging ? "cursor-crosshair" : ""}`}
      onClick={handleContainerClick}
    >
      {hotspots.map((hotspot) => (
        <HotspotDot
          key={hotspot.id}
          hotspot={hotspot}
          postId={postId}
          isOwner={isOwner}
        />
      ))}

      {pending && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="glass-raised absolute z-10 w-56 -translate-x-1/2 rounded-2xl p-3"
          style={{ left: `${pending.x * 100}%`, top: `${pending.y * 100}%` }}
        >
          <p className="mb-2 text-xs font-medium">Tag which mod?</p>
          {availableParts.length === 0 ? (
            <p className="text-xs text-muted">
              Add a modification to this build first.
            </p>
          ) : (
            <select
              disabled={isSaving}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleAssign(e.target.value);
              }}
              className="glass-inset w-full rounded-lg px-2 py-1.5 text-xs text-foreground transition-colors focus:border-accent/60 focus:outline-none"
            >
              <option value="" disabled>
                Choose a mod…
              </option>
              {availableParts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.raw_name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setPending(null)}
            className="mt-2 text-xs text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
