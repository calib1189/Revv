"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GroupedButtonRow, GroupedList } from "@/components/ui/grouped-list";
import { CheckIcon } from "@/components/ui/icons";
import { attendMeetupAction, leaveMeetupAction } from "@/features/meetups/actions";

export interface GarageCarOption {
  id: string;
  title: string;
  heroUrl: string | null;
}

/** The RSVP control on a meet's page. Someone with one car goes straight
 * to "You're going" with it; someone with several picks which car they're
 * bringing from their garage, inline, before it's saved. The attendee
 * list above refreshes from the server once the action revalidates. */
export function AttendButton({
  meetupId,
  isLoggedIn,
  cars,
  attending,
}: {
  meetupId: string;
  isLoggedIn: boolean;
  cars: GarageCarOption[];
  /** null when the viewer hasn't said they're going. */
  attending: { vehicleId: string | null } | null;
}) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="block">
        <Button className="w-full py-3 text-[0.9375rem]">Log in to say you&apos;re going</Button>
      </Link>
    );
  }

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setPicking(false);
    });
  }

  function handleGoing() {
    if (cars.length > 1) {
      setPicking(true);
      return;
    }
    run(() => attendMeetupAction(meetupId, cars[0]?.id ?? null));
  }

  const bringing = attending?.vehicleId ? cars.find((c) => c.id === attending.vehicleId) : null;
  const canChangeCar = cars.length > 1 || (cars.length === 1 && !bringing);

  return (
    <div className="flex flex-col gap-3">
      {attending && !picking ? (
        <div className="glass-raised elev-1 overflow-hidden rounded-[22px]">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#30d158] text-white">
              <CheckIcon className="h-[17px] w-[17px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-semibold">You&apos;re going</p>
              <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
                {bringing ? `Bringing ${bringing.title}` : cars.length === 0 ? "No car in your garage yet" : "No car picked"}
              </p>
            </div>
          </div>
          <div className="flex border-t border-border">
            {canChangeCar && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => (cars.length > 1 ? setPicking(true) : run(() => attendMeetupAction(meetupId, cars[0].id)))}
                className="flex-1 border-r border-border py-2.5 text-[0.875rem] font-semibold text-accent transition-colors active:bg-foreground/[0.06] disabled:opacity-50"
              >
                {cars.length > 1 ? "Change car" : "Add my car"}
              </button>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => leaveMeetupAction(meetupId))}
              className="flex-1 py-2.5 text-[0.875rem] font-semibold text-muted transition-colors active:bg-foreground/[0.06] disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Can't go"}
            </button>
          </div>
        </div>
      ) : picking ? (
        <GroupedList footer="Your car's rating shows next to your name, and counts toward the meet's rating.">
          <p className="px-4 pb-2 pt-3 text-[0.8125rem] font-semibold text-muted">Which car are you bringing?</p>
          {cars.map((car) => (
            <GroupedButtonRow
              key={car.id}
              disabled={isPending}
              onClick={() => run(() => attendMeetupAction(meetupId, car.id))}
              label={car.title}
              icon={
                <span className="relative h-[30px] w-[30px] flex-shrink-0 overflow-hidden rounded-[8px] bg-foreground/[0.06]">
                  {car.heroUrl && <Image src={car.heroUrl} alt="" fill sizes="30px" className="object-cover" />}
                </span>
              }
              trailing={
                attending?.vehicleId === car.id ? <CheckIcon className="h-4 w-4 flex-shrink-0 text-accent" /> : undefined
              }
            />
          ))}
          <GroupedButtonRow disabled={isPending} onClick={() => setPicking(false)} label={<span className="text-muted">Cancel</span>} />
        </GroupedList>
      ) : (
        <Button onClick={handleGoing} disabled={isPending} className="w-full py-3 text-[0.9375rem]">
          {isPending ? "Saving…" : "I'm going"}
        </Button>
      )}
      {error && <p className="px-1 text-[0.8125rem] text-danger">{error}</p>}
    </div>
  );
}
