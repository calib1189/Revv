"use client";

import { useRouter } from "next/navigation";
import { DeleteMeetupButton } from "@/features/meetups/delete-meetup-button";

export function MeetupDetailDeleteButton({ meetupId }: { meetupId: string }) {
  const router = useRouter();
  return <DeleteMeetupButton meetupId={meetupId} onDeleted={() => router.push("/discover")} />;
}
