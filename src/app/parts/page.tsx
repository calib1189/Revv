import { redirect } from "next/navigation";

// Marketplace pulled from the tab pager (see tabs-shell-content.tsx) since
// there's nothing real on it yet — anyone still holding a link to /parts
// (an old bookmark, a share) gets sent somewhere real instead of a panel
// that no longer exists in TAB_HREFS.
export default function PartsPage() {
  redirect("/garage");
}
