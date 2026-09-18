import { SegmentedLinks } from "@/components/ui/segmented-links";

export function InboxTabs({ current }: { current: "messages" | "activity" }) {
  return (
    <SegmentedLinks
      className="mb-6"
      options={[
        { href: "/messages", label: "Messages", active: current === "messages" },
        { href: "/notifications", label: "Activity", active: current === "activity" },
      ]}
    />
  );
}
