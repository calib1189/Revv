"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/storage/upload";
import { createMedia, publicMediaUrl } from "@/lib/db/media";
import {
  addBusinessProfileMedia,
  removeBusinessProfileMedia,
} from "@/lib/db/business-profile-media";
import { validateImageFile, MAX_IMAGE_BYTES } from "@/lib/validation/media";
import { validateBusinessDescription } from "@/lib/validation/business-profile";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";

type VerificationStatus = "none" | "pending" | "approved" | "rejected";

const MAX_GALLERY_PHOTOS = 10;

interface GalleryPhoto {
  id: string;
  url: string;
}

export function BusinessProfileEditor({
  userId,
  businessProfileId,
  description: initialDescription,
  logoUrl: initialLogoUrl,
  gallery: initialGallery,
  verificationStatus: initialStatus,
}: {
  userId: string;
  businessProfileId: string;
  /** Kept in the props list for future use (e.g. a "view live listing"
   * link once approved) — not read directly by this component today. */
  placeId: string;
  description: string;
  logoUrl: string | null;
  gallery: GalleryPhoto[];
  verificationStatus: VerificationStatus;
}) {
  const [description, setDescription] = useState(initialDescription);
  const [descError, setDescError] = useState<string | null>(null);
  const [descSaving, setDescSaving] = useState(false);
  const [descSaved, setDescSaved] = useState(false);

  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [gallery, setGallery] = useState<GalleryPhoto[]>(initialGallery);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [verificationStatus, setVerificationStatus] = useState(initialStatus);
  const [verifyUploading, setVerifyUploading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const verifyInputRef = useRef<HTMLInputElement>(null);

  async function handleSaveDescription() {
    const error = validateBusinessDescription(description);
    if (error) return setDescError(error);

    setDescError(null);
    setDescSaving(true);
    setDescSaved(false);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("business_profiles")
        .update({ description: description.trim() || null })
        .eq("id", businessProfileId);
      if (updateError) throw updateError;
      setDescSaved(true);
    } catch {
      setDescError("Couldn't save that. Try again.");
    } finally {
      setDescSaving(false);
    }
  }

  async function handleLogoFile(rawFile: File) {
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
    const fileError = validateImageFile(file);
    if (fileError) return setLogoError(fileError);

    setLogoError(null);
    setLogoUploading(true);
    try {
      const supabase = createClient();
      const uploaded = await uploadImage(supabase, userId, file);
      const media = await createMedia(supabase, {
        owner_id: userId,
        storage_path: uploaded.storagePath,
        kind: "image",
        width: uploaded.width,
        height: uploaded.height,
      });
      const { error: updateError } = await supabase
        .from("business_profiles")
        .update({ logo_media_id: media.id })
        .eq("id", businessProfileId);
      if (updateError) throw updateError;
      setLogoUrl(publicMediaUrl(supabase, uploaded.storagePath));
    } catch {
      setLogoError("Couldn't upload that photo. Try again.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleGalleryFiles(files: FileList) {
    if (gallery.length >= MAX_GALLERY_PHOTOS) return;
    setGalleryError(null);
    setGalleryUploading(true);
    try {
      const supabase = createClient();
      const next: GalleryPhoto[] = [...gallery];
      for (const rawFile of Array.from(files)) {
        if (next.length >= MAX_GALLERY_PHOTOS) break;
        const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
        const fileError = validateImageFile(file);
        if (fileError) {
          setGalleryError(fileError);
          continue;
        }
        const uploaded = await uploadImage(supabase, userId, file);
        const media = await createMedia(supabase, {
          owner_id: userId,
          storage_path: uploaded.storagePath,
          kind: "image",
          width: uploaded.width,
          height: uploaded.height,
        });
        const row = await addBusinessProfileMedia(supabase, businessProfileId, media.id, next.length);
        next.push({ id: row.id, url: publicMediaUrl(supabase, uploaded.storagePath) });
      }
      setGallery(next);
    } catch {
      setGalleryError("Couldn't upload one of those photos. Try again.");
    } finally {
      setGalleryUploading(false);
    }
  }

  async function handleRemoveGalleryPhoto(id: string) {
    setGalleryError(null);
    try {
      const supabase = createClient();
      await removeBusinessProfileMedia(supabase, id);
      setGallery((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setGalleryError("Couldn't remove that photo. Try again.");
    }
  }

  async function handleVerificationFile(rawFile: File) {
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
    const fileError = validateImageFile(file);
    if (fileError) return setVerifyError(fileError);

    setVerifyError(null);
    setVerifyUploading(true);
    try {
      const supabase = createClient();
      const uploaded = await uploadImage(supabase, userId, file);
      const media = await createMedia(supabase, {
        owner_id: userId,
        storage_path: uploaded.storagePath,
        kind: "image",
        width: uploaded.width,
        height: uploaded.height,
      });
      const { error: updateError } = await supabase
        .from("business_profiles")
        .update({ verification_media_id: media.id, verification_status: "pending" })
        .eq("id", businessProfileId);
      if (updateError) throw updateError;
      setVerificationStatus("pending");
    } catch {
      setVerifyError("Couldn't upload that. Try again.");
    } finally {
      setVerifyUploading(false);
    }
  }

  const card = "glass-raised elev-1 rounded-[22px] p-5";
  const smallButton = "h-9 px-4 py-0 text-[0.875rem] font-semibold";

  return (
    <div className="flex flex-col gap-6">
      <section className={card}>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-foreground/[0.06]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- small avatar-sized preview, next/image overhead isn't worth it here
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[0.75rem] text-muted">No logo</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[1.0625rem] font-semibold">Logo</p>
            <p className="mt-0.5 text-[0.8125rem] text-muted">Square images look best.</p>
            <input
              ref={logoInputRef}
              id="business-logo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={logoUploading}
              onClick={() => logoInputRef.current?.click()}
              className={`mt-2.5 ${smallButton}`}
            >
              {logoUploading ? "Uploading…" : logoUrl ? "Change Logo" : "Upload Logo"}
            </Button>
          </div>
        </div>
        {logoError && <p className="mt-3 text-[0.8125rem] text-danger">{logoError}</p>}
      </section>

      <section className={card}>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-[1.0625rem] font-semibold">Photos</p>
          <span className="numeral text-[0.8125rem] text-muted">
            {gallery.length}/{MAX_GALLERY_PHOTOS}
          </span>
        </div>
        <p className="mb-3 text-[0.8125rem] text-muted">Shown as a gallery on your Discover listing.</p>
        {gallery.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {gallery.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-[12px] bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- storage-hosted gallery thumbnail, fixed small grid size */}
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveGalleryPhoto(photo.id)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleGalleryFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {gallery.length < MAX_GALLERY_PHOTOS && (
          <Button
            type="button"
            variant="secondary"
            disabled={galleryUploading}
            onClick={() => galleryInputRef.current?.click()}
            className="h-10 w-full text-[0.9375rem] font-semibold"
          >
            {galleryUploading ? "Uploading…" : gallery.length > 0 ? "Add More Photos" : "Add Photos"}
          </Button>
        )}
        {galleryError && <p className="mt-2 text-[0.8125rem] text-danger">{galleryError}</p>}
      </section>

      <section className={card}>
        <Label htmlFor="business-description" className="px-0 text-[1.0625rem] font-semibold text-foreground">
          Description
        </Label>
        <Textarea
          id="business-description"
          rows={4}
          maxLength={500}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setDescSaved(false);
          }}
          placeholder="What makes your shop worth a visit"
        />
        {descError && <p className="mt-1.5 text-[0.8125rem] text-danger">{descError}</p>}
        <div className="mt-3 flex items-center gap-3">
          <Button type="button" disabled={descSaving} onClick={handleSaveDescription} className={smallButton}>
            {descSaving ? "Saving…" : "Save"}
          </Button>
          {descSaved && (
            <span className="flex items-center gap-1 text-[0.8125rem] font-medium text-success">
              <CheckIcon className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
        </div>
      </section>

      <section className={card}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[1.0625rem] font-semibold">Verification</p>
          {verificationStatus === "pending" && (
            <span className="flex-shrink-0 rounded-full bg-foreground/10 px-2.5 py-0.5 text-[0.75rem] font-semibold text-muted">
              In review
            </span>
          )}
        </div>
        {verificationStatus === "approved" ? (
          <div className="mt-2 flex items-center gap-2 text-[0.875rem] text-success">
            <CheckIcon className="h-4 w-4 flex-shrink-0" />
            Verified. Your logo, photos, and description are live on Discover.
          </div>
        ) : (
          <>
            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">
              Upload a photo of your business license, a utility bill showing your business name
              and address, or a storefront photo with your username written on paper in frame. An
              admin reviews it before your logo, photos, and description go live.
            </p>
            {verificationStatus === "rejected" && (
              <p className="mt-2 text-[0.8125rem] text-danger">
                Not approved. Make sure the document or photo clearly shows your business name,
                then try again.
              </p>
            )}
            <input
              ref={verifyInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVerificationFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={verifyUploading || verificationStatus === "pending"}
              onClick={() => verifyInputRef.current?.click()}
              className="mt-4 h-10 w-full text-[0.9375rem] font-semibold"
            >
              {verifyUploading
                ? "Uploading…"
                : verificationStatus === "pending"
                  ? "Submitted"
                  : verificationStatus === "rejected"
                    ? "Resubmit Proof"
                    : "Submit for Verification"}
            </Button>
            {verifyError && <p className="mt-2 text-[0.8125rem] text-danger">{verifyError}</p>}
          </>
        )}
      </section>
    </div>
  );
}
