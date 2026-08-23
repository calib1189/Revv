import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

interface ImageDimensions {
  width: number;
  height: number;
}

function readImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

export interface UploadedImage {
  storagePath: string;
  width: number;
  height: number;
}

export async function uploadImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<UploadedImage> {
  const dimensions = await readImageDimensions(file);
  const extension = file.name.split(".").pop() || "jpg";
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(storagePath, file, { contentType: file.type });

  if (error) throw error;

  return { storagePath, ...dimensions };
}

interface VideoMetadata extends ImageDimensions {
  durationMs: number;
}

function readVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        durationMs: Math.round(video.duration * 1000),
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata."));
    };
    video.src = url;
  });
}

export interface UploadedVideo {
  storagePath: string;
  width: number;
  height: number;
  durationMs: number;
}

export async function uploadVideo(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<UploadedVideo> {
  const metadata = await readVideoMetadata(file);
  const extension = file.name.split(".").pop() || "mp4";
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(storagePath, file, { contentType: file.type });

  if (error) throw error;

  return { storagePath, ...metadata };
}
