import { FitmentCalculator } from "@/features/fitment/fitment-calculator";
import { PageHeader, PageShell } from "@/components/ui/page-header";

export default function FitmentToolPage() {
  return (
    <PageShell>
      <PageHeader
        title="Fitment"
        eyebrow="Calculator"
        back={{ href: "/garage", label: "Garage" }}
        description="Real formulas applied to the numbers you enter. It does arithmetic, not a guess about whether a specific part fits your specific car."
      />
      <FitmentCalculator />
    </PageShell>
  );
}
