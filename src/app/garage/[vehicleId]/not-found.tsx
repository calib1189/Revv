import { NotFoundState } from "@/components/ui/not-found-state";
import { WheelIcon } from "@/components/ui/icons";

export default function VehicleNotFound() {
  return (
    <NotFoundState
      icon={<WheelIcon />}
      title="Vehicle not found"
      body="This vehicle doesn't exist or was removed."
      href="/garage"
      cta="Back to Garage"
    />
  );
}
