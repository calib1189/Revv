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

  return (
    <div className="flex flex-col gap-8">
      <section>
        <Label htmlFor="business-logo">Logo</Label>
        <div className="mt-2 flex items-center gap-4">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-surface-raised">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- small avatar-sized preview, next/image overhead isn't worth it here
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted">No logo</span>
            )}
          </div>
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
            className="px-3 py-1.5 text-sm"
          >
            {logoUploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
          </Button>
        </div>
        {logoError && <p className="mt-2 text-sm text-danger">{logoError}</p>}
      </section>

      <section>
        <Label>Photos</Label>
        <p className="mb-2 text-xs text-muted">
          Shown as a scrollable gallery on your Discover listing.
        </p>
        {gallery.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
            {gallery.map((photo) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- storage-hosted gallery thumbnail, fixed small grid size */}
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveGalleryPhoto(photo.id)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
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
            className="px-3 py-1.5 text-sm"
          >
            {galleryUploading ? "Uploading…" : gallery.length > 0 ? "Add more photos" : "Add photos"}
          </Button>
        )}
        {galleryError && <p className="mt-2 text-sm text-danger">{galleryError}</p>}
      </section>

      <section>
        <Label htmlFor="business-description">Description</Label>
        <textarea
          id="business-description"
          rows={4}
          maxLength={500}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setDescSaved(false);
          }}
          placeholder="What makes your shop worth a visit"
          className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
        />
        {descError && <p className="mt-1.5 text-sm text-danger">{descError}</p>}
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={descSaving}
            onClick={handleSaveDescription}
            className="px-3 py-1.5 text-sm"
          >
            {descSaving ? "Saving…" : "Save description"}
          </Button>
          {descSaved && <span className="text-xs text-success">Saved</span>}
        </div>
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="text-sm font-medium">Verification</p>
        {verificationStatus === "approved" ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-success">
            <CheckIcon className="h-4 w-4" />
            Verified — your logo, photos, and description are live on Discover.
          </div>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted">
              Upload a photo of your business license, a utility bill showing your business name
              and address, or a storefront photo with your username written on paper in frame. An
              admin reviews it before your logo, photos, and description go live.
            </p>
            {verificationStatus === "pending" && (
              <p className="mt-2 text-xs text-muted">Submitted — waiting on review.</p>
            )}
            {verificationStatus === "rejected" && (
              <p className="mt-2 text-xs text-danger">
                Not approved — make sure the document or photo clearly shows your business name,
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
              className="mt-3 px-3 py-1.5 text-sm"
            >
              {verifyUploading
                ? "Uploading…"
                : verificationStatus === "pending"
                  ? "Submitted"
                  : verificationStatus === "rejected"
                    ? "Resubmit proof"
                    : "Submit for verification"}
            </Button>
            {verifyError && <p className="mt-2 text-sm text-danger">{verifyError}</p>}
          </>
        )}
      </section>
    </div>
  );
}
