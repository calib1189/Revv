import { TabsShellContent } from "@/features/shell/tabs-shell-content";

// Back to being one of the swipeable pager's panels (see tab-order.ts).
export default function GaragePage() {
  return <TabsShellContent initialHref="/garage" />;
}
