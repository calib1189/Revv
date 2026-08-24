import type { VehicleCategory } from "@/lib/vehicles/category";

export interface VehicleIdentification {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  /** Best-guess category from what the photo shows — still just a
   * suggestion like every other field here, applied to the form only if
   * the owner clicks "Use these details". Null when the model can't tell
   * (falls back to the form's own "cars" default, not a guess). */
  category: VehicleCategory | null;
  /** 0-1. Always surfaced in the UI — never hidden from the user. */
  confidence: number;
  isMock: boolean;
}

export interface VisionProvider {
  identifyVehicle(
    imageBytes: ArrayBuffer,
    mimeType: string,
  ): Promise<VehicleIdentification>;
}
