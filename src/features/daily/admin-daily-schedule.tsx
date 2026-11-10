"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadErrorMessage } from "@/lib/storage/upload";
import { createMedia, publicMediaUrl } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { clearDailyChallengeAction, scheduleDailyChallengeAction } from "@/features/daily/actions";
import { CHALLENGE_ICONS, type ChallengeIcon } from "@/lib/daily/rotation";
import { MAX_CHALLENGE_DESCRIPTION, MAX_CHALLENGE_TITLE, MAX_PRIZE, MAX_SPONSOR_NAME } from "@/lib/daily/validation";
import { formatDayShort } from "@/lib/daily/format";
import { ChallengeIconGlyph } from "@/features/daily/challenge-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ScheduleDay {
  dateKey: string;
  isToday: boolean;
  isCustom: boolean;
  title: string;
  description: string;
  icon: ChallengeIcon;
  coverMediaId: string | null;
  coverUrl: string | null;
  sponsorName: string | null;
  sponsorUrl: string | null;
  sponsorLogoMediaId: string | null;
  sponsorLogoUrl: string | null;
  prize: string | null;
}

type Uploaded = { mediaId: string; url: string };

/** Admin: the next two months, one row per day; tap a day to edit it. */
export function AdminDailySchedule({ days, adminId }: { days: ScheduleDay[]; adminId: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-2.5">
      {days.map((day) => (
        <li key={day.dateKey}>
          {editing === day.dateKey ? (
            <DayEditor day={day} adminId={adminId} onDone={() => setEditing(null)} />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(day.dateKey)}
              className="pressable glass-raised elev-1 flex w-full items-center gap-3 rounded-[20px] p-3 text-left"
            >
              <span className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-foreground/[0.06]">
                {day.coverUrl ? (
                  <Image src={day.coverUrl} alt="" fill sizes="112px" className="object-cover" />
                ) : (
                  <ChallengeIconGlyph icon={day.icon} className="h-7 w-7 text-muted" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.75rem] text-muted">
                  {day.isToday ? "Today" : formatDayShort(day.dateKey)} · {day.isCustom ? "Scheduled" : "Rotation"}
                </span>
                <span className="block truncate text-[0.9375rem] font-semibold">{day.title}</span>
                {(day.sponsorName || day.prize) && (
                  <span className="mt-0.5 block truncate text-[0.75rem] font-semibold text-accent">
                    {day.sponsorName ? `Sponsored by ${day.sponsorName}` : "Prize day"}
                    {day.prize ? ` · ${day.prize}` : ""}
                  </span>
                )}
              </span>
              <span className="text-[0.8125rem] font-semibold text-accent">Edit</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Uploads one (already checked) image as the admin and hands back its
 * media row. */
async function uploadAdminImage(adminId: string, file: File): Promise<Uploaded> {
  const supabase = createClient();
  const uploaded = await uploadImage(supabase, adminId, file, { moderate: true });
  const media = await createMedia(supabase, {
    owner_id: adminId,
    storage_path: uploaded.storagePath,
    kind: "image",
    width: uploaded.width,
    height: uploaded.height,
  });
  return { mediaId: media.id, url: publicMediaUrl(supabase, uploaded.storagePath) };
}

function ImagePicker({
  label,
  hint,
  value,
  onChange,
  adminId,
  onError,
  round = false,
}: {
  label: string;
  hint?: string;
  value: Uploaded | null;
  onChange: (value: Uploaded | null) => void;
  adminId: string;
  onError: (message: string | null) => void;
  round?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  async function handleFile(rawFile: File) {
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
    const fileError = validateImageFile(file);
    if (fileError) return onError(fileError);
    onError(null);
    setIsUploading(true);
    try {
      onChange(await uploadAdminImage(adminId, file));
    } catch (err) {
      onError(uploadErrorMessage(err, "Couldn't upload that photo."));
    } finally {
      setIsUploading(false);
    }
  }
  return (
    <div>
      <Label>{label}</Label>
      {hint && <p className="-mt-1 mb-2 text-[0.75rem] text-muted">{hint}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-3">
        <span
          className={`relative overflow-hidden bg-foreground/[0.06] ${round ? "h-14 w-14 rounded-full" : "h-16 w-24 rounded-[10px]"}`}
        >
          {value && <Image src={value.url} alt="" fill sizes="192px" className={round ? "object-contain p-1" : "object-cover"} />}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={isUploading}
          onClick={() => fileRef.current?.click()}
          className="h-9 px-4 py-0 text-[0.8125rem]"
        >
          {isUploading ? "Uploading…" : value ? "Change" : "Upload"}
        </Button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="text-[0.8125rem] text-muted">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function DayEditor({ day, adminId, onDone }: { day: ScheduleDay; adminId: string; onDone: () => void }) {
  const [title, setTitle] = useState(day.title);
  const [description, setDescription] = useState(day.description);
  const [icon, setIcon] = useState<ChallengeIcon>(day.icon);
  const [cover, setCover] = useState<Uploaded | null>(
    day.coverMediaId && day.coverUrl ? { mediaId: day.coverMediaId, url: day.coverUrl } : null,
  );
  const [sponsorName, setSponsorName] = useState(day.sponsorName ?? "");
  const [sponsorUrl, setSponsorUrl] = useState(day.sponsorUrl ?? "");
  const [logo, setLogo] = useState<Uploaded | null>(
    day.sponsorLogoMediaId && day.sponsorLogoUrl ? { mediaId: day.sponsorLogoMediaId, url: day.sponsorLogoUrl } : null,
  );
  const [prize, setPrize] = useState(day.prize ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await scheduleDailyChallengeAction({
        dateKey: day.dateKey,
        title,
        description,
        icon,
        coverMediaId: cover?.mediaId ?? null,
        sponsor: { name: sponsorName, url: sponsorUrl, logoMediaId: logo?.mediaId ?? null, prize },
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  function handleClear() {
    if (!window.confirm("Put this day back on the weekday rotation? Its title, photo, sponsor and prize are removed.")) return;
    setError(null);
    startTransition(async () => {
      const result = await clearDailyChallengeAction(day.dateKey);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="glass-raised elev-1 flex flex-col gap-4 rounded-[20px] p-4">
      <p className="text-[0.8125rem] font-semibold text-muted">{day.isToday ? "Today" : formatDayShort(day.dateKey)}</p>
      <div>
        <Label htmlFor={`title-${day.dateKey}`}>Title</Label>
        <Input
          id={`title-${day.dateKey}`}
          value={title}
          maxLength={MAX_CHALLENGE_TITLE}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`desc-${day.dateKey}`}>Description</Label>
        <Textarea
          id={`desc-${day.dateKey}`}
          rows={3}
          value={description}
          maxLength={MAX_CHALLENGE_DESCRIPTION}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <ImagePicker
        label="Cover photo"
        hint="The big picture on the challenge card. Without one, the photo for the icon below is used."
        value={cover}
        onChange={setCover}
        adminId={adminId}
        onError={setError}
      />
      <div>
        <Label>Icon (picks the stock photo when there&apos;s no cover)</Label>
        <div className="flex flex-wrap gap-2">
          {CHALLENGE_ICONS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              aria-pressed={icon === key}
              aria-label={key}
              className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${
                icon === key ? "bg-accent text-white" : "bg-foreground/[0.08] text-muted"
              }`}
            >
              <ChallengeIconGlyph icon={key} className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-[16px] bg-foreground/[0.04] p-3.5">
        <div>
          <p className="text-[0.875rem] font-semibold">Sponsor and prize</p>
          <p className="mt-0.5 text-[0.75rem] leading-relaxed text-muted">
            Optional. Leave it all blank for a normal day. A prize works without a sponsor, for a day SORZA runs itself.
          </p>
        </div>
        <div>
          <Label htmlFor={`sponsor-${day.dateKey}`}>Sponsor name</Label>
          <Input
            id={`sponsor-${day.dateKey}`}
            value={sponsorName}
            maxLength={MAX_SPONSOR_NAME}
            placeholder="Lone Star Detailing"
            onChange={(e) => setSponsorName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`sponsor-url-${day.dateKey}`}>Sponsor link</Label>
          <Input
            id={`sponsor-url-${day.dateKey}`}
            value={sponsorUrl}
            inputMode="url"
            placeholder="https://their-site.com"
            onChange={(e) => setSponsorUrl(e.target.value)}
          />
        </div>
        <ImagePicker
          label="Sponsor logo"
          hint="Square works best. Shown small next to their name."
          value={logo}
          onChange={setLogo}
          adminId={adminId}
          onError={setError}
          round
        />
        <div>
          <Label htmlFor={`prize-${day.dateKey}`}>Prize for the winner</Label>
          <Input
            id={`prize-${day.dateKey}`}
            value={prize}
            maxLength={MAX_PRIZE}
            placeholder="Free full detail ($150 value)"
            onChange={(e) => setPrize(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-[0.8125rem] text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={isPending} onClick={handleSave} className="h-10 flex-1 text-[0.875rem] font-semibold">
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone} className="h-10 px-5 text-[0.875rem]">
          Cancel
        </Button>
      </div>
      {day.isCustom && !day.isToday && (
        <button type="button" onClick={handleClear} disabled={isPending} className="self-start text-[0.8125rem] text-muted">
          Clear this day (back to the rotation)
        </button>
      )}
    </div>
  );
}
