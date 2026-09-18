import { NotFoundState } from "@/components/ui/not-found-state";
import { FlagIcon } from "@/components/ui/icons";

export default function CrewNotFound() {
  return (
    <NotFoundState
      icon={<FlagIcon />}
      title="Crew not found"
      body="This crew doesn't exist, or it's private."
      href="/crews"
      cta="Back to Crews"
    />
  );
}
