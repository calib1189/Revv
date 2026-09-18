import { NotFoundState } from "@/components/ui/not-found-state";
import { PersonIcon } from "@/components/ui/icons";

export default function ProfileNotFound() {
  return (
    <NotFoundState
      icon={<PersonIcon />}
      title="Profile not found"
      body="There's no one on SORZA with that username."
    />
  );
}
