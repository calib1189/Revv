export interface VehicleIdentification {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
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
