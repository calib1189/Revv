import { NotFoundState } from "@/components/ui/not-found-state";
import { GridIcon } from "@/components/ui/icons";

export default function PostNotFound() {
  return (
    <NotFoundState icon={<GridIcon />} title="Post not found" body="This post doesn't exist or was removed." />
  );
}
