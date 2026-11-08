import type { Metadata } from "next";
import { DailyPageContent } from "@/features/daily/daily-page-content";

export const metadata: Metadata = {
  title: "Sorza Daily",
  description: "A new car challenge every day. Enter your build, vote for the best, and see who wins.",
};

export default function DailyPage() {
  return <DailyPageContent />;
}
