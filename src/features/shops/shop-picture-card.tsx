"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { removeShopPictureAction, saveShopPictureAction } from "@/features/shops/actions";
import { uploadShopPicture } from "@/features/shops/upload-shop-picture";
import { Button } from "@/components/ui/button";
import { CameraIcon } from "@/components/ui/icons";

export type ShopPictureMode = "add" | "owner" | "admin";

/**
 * A shop's profile picture, managed from its own page by whoever can:
 * - "add": they've paid to promote it and it has no picture yet
 * - "owner": they added the current one, so they can change or remove it
 * - "admin": someone else's picture, which an admin can only take down
 *
 * Works in the iOS app too: changing a picture isn't a purchase.
 */
export function ShopPictureCard({
  placeId,
  placeName,
  userId,
  pictureUrl: initialPictureUrl,
  mode: initialMode,
}: {
  placeId: string;
  placeName: string;
  userId: string;
  pictureUrl: string | null;
  mode: ShopPictureMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [pictureUrl, setPictureUrl] = useState(initialPictureUrl);
  const [busy, setBusy] = useState<"uploading" | "removing" | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removedByAdmin, setRemovedByAdmin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy("uploading");
    const upload = await uploadShopPicture(userId, file);
    if ("error" in upload) {
      setError(upload.error);
      setBusy(null);
      return;
    }
    const saved = await saveShopPictureAction({ placeId, mediaId: upload.mediaId });
    setBusy(null);
    if (saved.error) {
      setError(saved.error);
      return;
    }
    setPictureUrl(upload.url);
    setMode("owner");
    router.refresh();
  }

  async function handleRemove() {
    setError(null);
    setBusy("removing");
    const result = await removeShopPictureAction(placeId);
    setBusy(null);
    setConfirmingRemove(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPictureUrl(null);
    if (mode === "admin") setRemovedByAdmin(true);
    else setMode("add");
    router.refresh();
  }

  if (removedByAdmin) {
    return (
      <p className="glass-raised elev-1 rounded-[22px] p-4 text-center text-[0.875rem] text-muted">
        Picture removed.
      </p>
    );
  }

  const description =
    mode === "add"
      ? `You've promoted ${placeName}, so you can give it a profile picture. It shows on its page and in Shops, and stays after your promotion ends.`
      : mode === "owner"
        ? `Shows on ${placeName}'s page and in Shops. It stays after your promotion ends.`
        : "Added by someone who promoted this shop.";

  return (
    <section className="glass-raised elev-1 rounded-[22px] p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-foreground/[0.06] text-muted">
          {pictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small fixed-size preview, next/image overhead isn't worth it here
            <img src={pictureUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <CameraIcon className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[0.9375rem] font-semibold">Profile picture</h2>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{description}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {confirmingRemove ? (
        <div className="mt-4 flex items-center gap-2.5">
          <p className="min-w-0 flex-1 text-[0.875rem]">Remove this picture?</p>
          <Button
            type="button"
            variant="ghost"
            disabled={busy !== null}
            onClick={() => setConfirmingRemove(false)}
            className="h-9 px-4 py-0 text-[0.875rem] font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy !== null}
            onClick={() => void handleRemove()}
            className="h-9 px-4 py-0 text-[0.875rem] font-semibold"
          >
            {busy === "removing" ? "Removing…" : "Remove"}
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex gap-2.5">
          {mode !== "admin" && (
            <Button
              type="button"
              variant={mode === "add" ? "primary" : "secondary"}
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
              className="h-10 flex-1 text-[0.9375rem] font-semibold"
            >
              {busy === "uploading"
                ? "Uploading…"
                : mode === "add"
                  ? "Add picture"
                  : "Change picture"}
            </Button>
          )}
          {mode !== "add" && (
            <Button
              type="button"
              variant={mode === "admin" ? "secondary" : "ghost"}
              disabled={busy !== null}
              onClick={() => setConfirmingRemove(true)}
              className={`h-10 text-[0.9375rem] font-semibold ${mode === "admin" ? "flex-1" : "px-5"}`}
            >
              {mode === "admin" ? "Remove picture" : "Remove"}
            </Button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[0.8125rem] text-danger">{error}</p>}
    </section>
  );
}
