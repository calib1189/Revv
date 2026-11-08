"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadErrorMessage } from "@/lib/storage/upload";
import { createMedia, publicMediaUrl } from "@/lib/db/media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { scheduleDailyChallengeAction } from "@/features/daily/actions";
import { CHALLENGE_ICONS, type ChallengeIcon } from "@/lib/daily/rotation";
import { MAX_CHALLENGE_DESCRIPTION, MAX_CHALLENGE_TITLE } from "@/lib/daily/validation";
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
}

/** Admin: the next two weeks, one row per day; tap a day to edit it. */
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
              </span>
              <span className="text-[0.8125rem] font-semibold text-accent">Edit</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function DayEditor({ day, adminId, onDone }: { day: ScheduleDay; adminId: string; onDone: () => void }) {
  const [title, setTitle] = useState(day.title);
  const [description, setDescription] = useState(day.description);
  const [icon, setIcon] = useState<ChallengeIcon>(day.icon);
  const [cover, setCover] = useState<{ mediaId: string; url: string } | null>(
    day.coverMediaId && day.coverUrl ? { mediaId: day.coverMediaId, url: day.coverUrl } : null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(rawFile: File) {
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
    const fileError = validateImageFile(file);
    if (fileError) return setError(fileError);
    setError(null);
    setIsUploading(true);
    try {
      const supabase = createClient();
      const uploaded = await uploadImage(supabase, adminId, file, { moderate: true });
      const media = await createMedia(supabase, {
        owner_id: adminId,
        storage_path: uploaded.storagePath,
        kind: "image",
        width: uploaded.width,
        height: uploaded.height,
      });
      setCover({ mediaId: media.id, url: publicMediaUrl(supabase, uploaded.storagePath) });
    } catch (err) {
      setError(uploadErrorMessage(err, "Couldn't upload that photo."));
    } finally {
      setIsUploading(false);
    }
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await scheduleDailyChallengeAction({
        dateKey: day.dateKey,
        title,
        description,
        icon,
        coverMediaId: cover?.mediaId ?? null,
      });
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
      <div>
        <Label>Visual when there&apos;s no cover photo</Label>
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
      <div>
        <Label>Cover photo</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <div className="flex items-center gap-3">
          <span className="relative h-16 w-24 overflow-hidden rounded-[10px] bg-foreground/[0.06]">
            {cover && <Image src={cover.url} alt="" fill sizes="192px" className="object-cover" />}
          </span>
          <Button
            type="button"
            variant="secondary"
            disabled={isUploading}
            onClick={() => fileRef.current?.click()}
            className="h-9 px-4 py-0 text-[0.8125rem]"
          >
            {isUploading ? "Uploading…" : cover ? "Change" : "Upload"}
          </Button>
          {cover && (
            <button type="button" onClick={() => setCover(null)} className="text-[0.8125rem] text-muted">
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-[0.8125rem] text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" disabled={isPending || isUploading} onClick={handleSave} className="h-10 flex-1 text-[0.875rem] font-semibold">
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone} className="h-10 px-5 text-[0.875rem]">
          Cancel
        </Button>
      </div>
    </div>
  );
}
