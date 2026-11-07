"use client";

import { useState, useTransition } from "react";
import { updateBusinessDetailsAction } from "@/features/business/actions";
import { DAY_KEYS, DAY_LABELS, type BusinessHours, type DayKey } from "@/lib/shops/hours";
import { MAX_SERVICES, MAX_SERVICE_LENGTH, MAX_TAGLINE_LENGTH } from "@/lib/shops/business-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { CheckIcon, CloseIcon, PlusIcon } from "@/components/ui/icons";

const SUGGESTED_SERVICES = [
  "Maintenance",
  "Diagnostics",
  "Window tint",
  "Exhaust",
  "Tuning",
  "Suspension",
  "Wheels & tires",
  "Body work",
  "Paint",
  "Detailing",
  "Ceramic coating",
  "Car audio",
];

const DEFAULT_DAY = { open: "08:00", close: "17:00" };

function defaultWeek(): BusinessHours {
  return {
    mon: { ...DEFAULT_DAY },
    tue: { ...DEFAULT_DAY },
    wed: { ...DEFAULT_DAY },
    thu: { ...DEFAULT_DAY },
    fri: { ...DEFAULT_DAY },
    sat: null,
    sun: null,
  };
}

const card = "glass-raised elev-1 rounded-[22px] p-5";
const timeInput =
  "glass-inset h-11 min-w-0 flex-1 rounded-[12px] px-3 text-[0.9375rem] text-foreground focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-40";

/** The parts of a claimed listing that are typed rather than uploaded:
 * tagline, services, weekly hours, and contact details. One Save button,
 * validated server-side (updateBusinessDetailsAction). */
export function BusinessDetailsEditor({
  businessProfileId,
  initial,
}: {
  businessProfileId: string;
  initial: {
    tagline: string;
    services: string[];
    hours: BusinessHours | null;
    phone: string;
    website: string;
    instagram: string;
  };
}) {
  const [tagline, setTagline] = useState(initial.tagline);
  const [services, setServices] = useState<string[]>(initial.services);
  const [serviceDraft, setServiceDraft] = useState("");
  const [hoursOn, setHoursOn] = useState(initial.hours !== null);
  const [hours, setHours] = useState<BusinessHours>(initial.hours ?? defaultWeek());
  const [phone, setPhone] = useState(initial.phone);
  const [website, setWebsite] = useState(initial.website);
  const [instagram, setInstagram] = useState(initial.instagram);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function touch() {
    setSaved(false);
  }

  function addService(raw: string) {
    const service = raw.trim().replace(/\s+/g, " ");
    if (!service) return;
    if (services.length >= MAX_SERVICES) return;
    if (services.some((s) => s.toLowerCase() === service.toLowerCase())) return;
    setServices([...services, service.slice(0, MAX_SERVICE_LENGTH)]);
    setServiceDraft("");
    touch();
  }

  function setDay(day: DayKey, value: BusinessHours[DayKey]) {
    setHours({ ...hours, [day]: value });
    touch();
  }

  function copyMondayToWeekdays() {
    const mon = hours.mon;
    setHours({ ...hours, tue: mon && { ...mon }, wed: mon && { ...mon }, thu: mon && { ...mon }, fri: mon && { ...mon } });
    touch();
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateBusinessDetailsAction({
        businessProfileId,
        tagline,
        services,
        hours: hoursOn ? hours : null,
        phone,
        website,
        instagram,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  const unusedSuggestions = SUGGESTED_SERVICES.filter(
    (s) => !services.some((existing) => existing.toLowerCase() === s.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <section className={card}>
        <Label htmlFor="business-tagline" className="px-0 text-[1.0625rem] font-semibold text-foreground">
          Tagline
        </Label>
        <p className="mb-3 text-[0.8125rem] text-muted">One line under your shop&apos;s name.</p>
        <Input
          id="business-tagline"
          value={tagline}
          maxLength={MAX_TAGLINE_LENGTH}
          onChange={(e) => {
            setTagline(e.target.value);
            touch();
          }}
          placeholder="Custom exhaust and tuning since 2009"
        />
      </section>

      <section className={card}>
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <p className="text-[1.0625rem] font-semibold">Services</p>
          <span className="numeral text-[0.8125rem] text-muted">
            {services.length}/{MAX_SERVICES}
          </span>
        </div>
        <p className="mb-3 text-[0.8125rem] text-muted">
          What you do. Customers pick from these when they review you.
        </p>

        {services.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {services.map((service) => (
              <li
                key={service}
                className="flex items-center gap-1.5 rounded-full bg-foreground/[0.08] py-1.5 pl-3.5 pr-1.5 text-[0.875rem] font-medium"
              >
                {service}
                <button
                  type="button"
                  aria-label={`Remove ${service}`}
                  onClick={() => {
                    setServices(services.filter((s) => s !== service));
                    touch();
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-foreground/10 hover:text-foreground"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {services.length < MAX_SERVICES && (
          <>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addService(serviceDraft);
              }}
            >
              <Input
                aria-label="Add a service"
                value={serviceDraft}
                maxLength={MAX_SERVICE_LENGTH}
                onChange={(e) => setServiceDraft(e.target.value)}
                placeholder="Add a service"
                className="flex-1"
              />
              <Button type="submit" variant="secondary" className="h-12 px-4" disabled={!serviceDraft.trim()}>
                Add
              </Button>
            </form>
            {unusedSuggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {unusedSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addService(s)}
                    className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[0.8125rem] text-muted hover:border-foreground/30 hover:text-foreground"
                  >
                    <PlusIcon className="h-3 w-3" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[1.0625rem] font-semibold">Hours</p>
            <p className="mt-0.5 text-[0.8125rem] text-muted">Shown on your listing, with today highlighted.</p>
          </div>
          <Toggle
            checked={hoursOn}
            onChange={(next) => {
              setHoursOn(next);
              touch();
            }}
            label="Show hours"
          />
        </div>

        {hoursOn && (
          <>
            <ul className="mt-4 flex flex-col divide-y divide-border">
              {DAY_KEYS.map((day) => {
                const value = hours[day];
                return (
                  <li key={day} className="flex flex-col gap-2.5 py-3 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[0.9375rem] font-medium">{DAY_LABELS[day]}</span>
                      <span className="flex items-center gap-3">
                        {!value && <span className="text-[0.8125rem] text-muted">Closed</span>}
                        <Toggle
                          checked={value !== null}
                          onChange={(open) => setDay(day, open ? { ...DEFAULT_DAY } : null)}
                          label={`Open on ${DAY_LABELS[day]}`}
                        />
                      </span>
                    </div>
                    {value && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          aria-label={`${DAY_LABELS[day]} opening time`}
                          value={value.open}
                          onChange={(e) => setDay(day, { ...value, open: e.target.value })}
                          className={timeInput}
                        />
                        <span className="text-[0.8125rem] text-muted">to</span>
                        <input
                          type="time"
                          aria-label={`${DAY_LABELS[day]} closing time`}
                          value={value.close}
                          onChange={(e) => setDay(day, { ...value, close: e.target.value })}
                          className={timeInput}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={copyMondayToWeekdays}
              className="mt-3 text-[0.8125rem] font-medium text-accent"
            >
              Copy Monday to Tuesday–Friday
            </button>
          </>
        )}
      </section>

      <section className={`${card} flex flex-col gap-4`}>
        <div>
          <p className="text-[1.0625rem] font-semibold">Contact</p>
          <p className="mt-0.5 text-[0.8125rem] text-muted">Replaces what Google has, when filled in.</p>
        </div>
        <div>
          <Label htmlFor="business-phone">Phone</Label>
          <Input
            id="business-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              touch();
            }}
            placeholder="(985) 555-0142"
          />
        </div>
        <div>
          <Label htmlFor="business-website">Website</Label>
          <Input
            id="business-website"
            inputMode="url"
            autoCapitalize="none"
            value={website}
            onChange={(e) => {
              setWebsite(e.target.value);
              touch();
            }}
            placeholder="yourshop.com"
          />
        </div>
        <div>
          <Label htmlFor="business-instagram">Instagram</Label>
          <Input
            id="business-instagram"
            autoCapitalize="none"
            value={instagram}
            onChange={(e) => {
              setInstagram(e.target.value);
              touch();
            }}
            placeholder="@yourshop"
          />
        </div>
      </section>

      <div className="flex flex-col gap-2">
        {error && (
          <p className="px-1 text-[0.8125rem] text-danger">{error}</p>
        )}
        <Button type="button" disabled={isPending} onClick={handleSave} className="h-12 w-full text-[0.9375rem] font-semibold">
          {isPending ? (
            "Saving…"
          ) : saved ? (
            <span className="flex items-center justify-center gap-1.5">
              <CheckIcon className="h-4 w-4" />
              Saved
            </span>
          ) : (
            "Save details"
          )}
        </Button>
      </div>
    </div>
  );
}
