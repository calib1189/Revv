"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia, publicMediaUrl } from "@/lib/db/media";
import { updateVehicle } from "@/lib/db/vehicles";
import { setGarageLayoutAction } from "@/features/garage/garage-layout-actions";
import { setGarageThemeAction } from "@/features/garage/garage-theme-actions";
import { GarageThemePicker } from "@/features/garage/garage-theme-picker";
import { GarageDiorama, type DioramaVehicle } from "@/features/garage/garage-diorama";
import {
  GARAGE_TEMPLATES,
  type GarageLayout,
  type GarageTemplate,
  type WallArt,
  type Plant,
  type Rug,
  type Lighting,
} from "@/lib/garage/layout";
import type { GarageTheme } from "@/lib/db/profiles";
import { removeBackground, isBackgroundRemovalSupported } from "@/lib/vision/background-removal";
import { Callout } from "@/components/ui/callout";

const TEMPLATE_OPTIONS: { value: GarageTemplate; label: string }[] = [
  { value: "single", label: "1 bay" },
  { value: "two-bay", label: "2 bays" },
  { value: "three-bay", label: "3 bays" },
];

const WALL_ART_OPTIONS: { value: WallArt; label: string }[] = [
  { value: "none", label: "None" },
  { value: "neon", label: "Neon sign" },
  { value: "pegboard", label: "Pegboard" },
  { value: "poster", label: "Poster wall" },
];

const PLANT_OPTIONS: { value: Plant; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fern", label: "Fern" },
  { value: "palm", label: "Palm" },
];

const RUG_OPTIONS: { value: Rug; label: string }[] = [
  { value: "none", label: "None" },
  { value: "plain", label: "Plain mat" },
  { value: "checker", label: "Checker" },
];

const LIGHTING_OPTIONS: { value: Lighting; label: string }[] = [
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "none", label: "Off" },
];

function resizeBays(bays: (string | null)[], count: number): (string | null)[] {
  return Array.from({ length: count }, (_, i) => bays[i] ?? null);
}

function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">{label}</p>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-accent text-accent-foreground"
                : "glass text-muted hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GarageEditor({
  userId,
  vehicles,
  initialLayout,
  initialTheme,
}: {
  userId: string;
  vehicles: DioramaVehicle[];
  initialLayout: GarageLayout;
  initialTheme: GarageTheme;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [theme, setTheme] = useState(initialTheme);
  const [vehiclesById, setVehiclesById] = useState(
    () => new Map(vehicles.map((v) => [v.id, v])),
  );
  const [cutoutProgress, setCutoutProgress] = useState<Record<string, number>>({});
  const [cutoutError, setCutoutError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isThemeSaving, startThemeSaving] = useTransition();

  function persistLayout(next: GarageLayout) {
    const previous = layout;
    setLayout(next);
    startSaving(async () => {
      const { error } = await setGarageLayoutAction(next);
      if (error) setLayout(previous);
    });
  }

  function handleTemplateChange(template: GarageTemplate) {
    persistLayout({ ...layout, template, bays: resizeBays(layout.bays, GARAGE_TEMPLATES[template]) });
  }

  function handleBayChange(index: number, vehicleId: string | null) {
    const bays = [...layout.bays];
    bays[index] = vehicleId;
    persistLayout({ ...layout, bays });
  }

  function handleThemeSelect(next: GarageTheme) {
    const previous = theme;
    setTheme(next);
    startThemeSaving(async () => {
      const { error } = await setGarageThemeAction(next);
      if (error) setTheme(previous);
    });
  }

  async function handleGenerateCutout(vehicleId: string) {
    const vehicle = vehiclesById.get(vehicleId);
    if (!vehicle?.heroUrl) return;

    setCutoutError(null);
    setCutoutProgress((p) => ({ ...p, [vehicleId]: 0 }));
    try {
      const blob = await removeBackground(vehicle.heroUrl, (fraction) => {
        setCutoutProgress((p) => ({ ...p, [vehicleId]: Math.round(fraction * 100) }));
      });

      const supabase = createClient();
      const file = new File([blob], `${vehicleId}-cutout.png`, { type: "image/png" });
      const uploaded = await uploadImage(supabase, userId, file);
      const media = await createMedia(supabase, {
        owner_id: userId,
        storage_path: uploaded.storagePath,
        kind: "image",
        width: uploaded.width,
        height: uploaded.height,
      });
      await updateVehicle(supabase, vehicleId, { garage_cutout_media_id: media.id });

      const cutoutUrl = publicMediaUrl(supabase, uploaded.storagePath);
      setVehiclesById((prev) => {
        const next = new Map(prev);
        const v = next.get(vehicleId);
        if (v) next.set(vehicleId, { ...v, cutoutUrl });
        return next;
      });
    } catch {
      setCutoutError("Couldn't generate a cutout for that photo. Try a different one.");
    } finally {
      setCutoutProgress((p) => {
        const next = { ...p };
        delete next[vehicleId];
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <GarageDiorama theme={theme} layout={layout} vehiclesById={vehiclesById} />

      {cutoutError && <Callout tone="danger">{cutoutError}</Callout>}

      <div className="glass flex flex-col gap-5 rounded-2xl p-4">
        <OptionPicker
          label="Layout"
          options={TEMPLATE_OPTIONS}
          value={layout.template}
          onChange={handleTemplateChange}
          disabled={isSaving}
        />

        <div>
          <p className="mb-2 text-xs font-medium text-muted">Floor</p>
          <GarageThemePicker theme={theme} onSelect={handleThemeSelect} isPending={isThemeSaving} />
        </div>

        <OptionPicker
          label="Wall art"
          options={WALL_ART_OPTIONS}
          value={layout.wallArt}
          onChange={(wallArt) => persistLayout({ ...layout, wallArt })}
          disabled={isSaving}
        />
        <OptionPicker
          label="Plant"
          options={PLANT_OPTIONS}
          value={layout.plant}
          onChange={(plant) => persistLayout({ ...layout, plant })}
          disabled={isSaving}
        />
        <OptionPicker
          label="Rug"
          options={RUG_OPTIONS}
          value={layout.rug}
          onChange={(rug) => persistLayout({ ...layout, rug })}
          disabled={isSaving}
        />
        <OptionPicker
          label="Lighting"
          options={LIGHTING_OPTIONS}
          value={layout.lighting}
          onChange={(lighting) => persistLayout({ ...layout, lighting })}
          disabled={isSaving}
        />
      </div>

      <div className="glass flex flex-col gap-4 rounded-2xl p-4">
        <p className="text-xs font-medium text-muted">Bays</p>
        {layout.bays.map((vehicleId, i) => {
          const vehicle = vehicleId ? vehiclesById.get(vehicleId) : undefined;
          const progress = vehicleId ? cutoutProgress[vehicleId] : undefined;
          return (
            <div key={i} className="flex items-center gap-3">
              <select
                value={vehicleId ?? ""}
                onChange={(e) => handleBayChange(i, e.target.value || null)}
                className="glass min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
              >
                <option value="">Empty</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title}
                  </option>
                ))}
              </select>
              {vehicle && !vehicle.cutoutUrl && vehicle.heroUrl && isBackgroundRemovalSupported() && (
                <button
                  type="button"
                  disabled={progress !== undefined}
                  onClick={() => handleGenerateCutout(vehicle.id)}
                  className="flex-shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-60"
                >
                  {progress !== undefined
                    ? progress > 0
                      ? `${progress}%`
                      : "Starting…"
                    : "Generate cutout"}
                </button>
              )}
              {vehicle?.cutoutUrl && (
                <span className="flex-shrink-0 text-xs text-muted">Cutout ready</span>
              )}
            </div>
          );
        })}
        <p className="text-xs text-muted">
          The first cutout downloads a one-time, on-device model (a few tens
          of MB) — best done on Wi-Fi. After that, cutouts are quick.
        </p>
      </div>
    </div>
  );
}
