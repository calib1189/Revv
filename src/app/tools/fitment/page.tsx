import { FitmentCalculator } from "@/features/fitment/fitment-calculator";

export default function FitmentToolPage() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Fitment calculator
      </h1>
      <p className="mb-8 text-sm text-muted">
        Deterministic arithmetic only — these are real formulas applied to
        the numbers you enter, not a guess about whether a specific part
        fits your specific car.
      </p>
      <FitmentCalculator />
    </div>
  );
}
