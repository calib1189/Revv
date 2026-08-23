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
