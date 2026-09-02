import { GaragePageContent } from "@/features/garage/garage-page-content";

// No longer one of the swipeable pager's panels (see tab-order.ts) — a
// real standalone route now, same as /parts. GaragePageContent itself
// needed no changes: it never depended on the pager for anything, only
// TopTabBar/TabPagerShell's own active-tab bookkeeping did.
export default function GaragePage() {
  return <GaragePageContent />;
}
