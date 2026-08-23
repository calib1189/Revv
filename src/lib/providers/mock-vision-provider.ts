import type { VehicleIdentification, VisionProvider } from "./vision-provider";

const SAMPLE_GUESSES: Omit<VehicleIdentification, "confidence" | "isMock">[] = [
  { year: 1998, make: "Toyota", model: "Supra", trim: "RZ" },
  { year: 2015, make: "Subaru", model: "WRX STI", trim: null },
  { year: 2020, make: "Mazda", model: "MX-5 Miata", trim: "Club" },
  { year: 1993, make: "Mazda", model: "RX-7", trim: "FD" },
  { year: 2018, make: "Honda", model: "Civic Type R", trim: null },
  { year: 2009, make: "Nissan", model: "GT-R", trim: "Premium" },
  { year: 2002, make: "BMW", model: "M3", trim: "E46" },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deliberately not connected to any real vision model — returns a
 * plausible-looking guess after a short simulated delay so the confirm UI
 * can be built and exercised before a real VisionProvider is wired up.
 */
export class MockVisionProvider implements VisionProvider {
  async identifyVehicle(): Promise<VehicleIdentification> {
    await delay(900 + Math.random() * 600);

    const guess =
      SAMPLE_GUESSES[Math.floor(Math.random() * SAMPLE_GUESSES.length)];

    return {
      ...guess,
      confidence: Math.round((0.45 + Math.random() * 0.4) * 100) / 100,
      isMock: true,
    };
  }
}
