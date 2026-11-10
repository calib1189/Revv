import type { Metadata } from "next";
import { ChallengeHero } from "@/features/daily/challenge-hero";
import { DAILY_POINTS } from "@/lib/points/values";

export const metadata: Metadata = {
  title: "Sponsor a Sorza Daily",
  description: "Put your brand on a day of Sorza Daily, the car challenge car people enter and vote on every day.",
};

const CONTACT = "sorzasupport@gmail.com";
const MAILTO = `mailto:${CONTACT}?subject=${encodeURIComponent("Sponsoring a Sorza Daily")}`;

const GETS = [
  {
    title: "Your name on the challenge",
    body: "“Presented by” with your logo, right under the title, linking to your site. On the Daily page, the Garage tab and the feed.",
  },
  {
    title: "In everyone's notifications",
    body: "That morning's “challenge is live” notification and the evening reminder both name you and your prize.",
  },
  {
    title: "A day of content about you",
    body: "Every entry that day is posted under your challenge. You pick the theme: cleanest wheels, best wrap, best shine.",
  },
  {
    title: "A winner who shows it off",
    body: "We announce the winner on our TikTok and tag you. Winners post their prize. Real people, real cars, your product.",
  },
];

const STEPS = [
  { title: "Pick a day and a prize", body: "A product, a service (a detail, a tint, an alignment) or a gift card. Most sponsors give a prize instead of paying." },
  { title: "Send your logo and link", body: "We set up the challenge with you: the title, the photo and the brief." },
  { title: "We run it and announce the winner", body: "We contact the winner and connect you to deliver the prize." },
];

/** The page to send brands and shops: what sponsoring a Sorza Daily gets
 * them, an example of how it looks, and how to book a day. */
export default function SponsorPage() {
  const exampleEnds = "2099-01-01T06:00:00.000Z";
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-5 pb-20 pt-8 sm:px-6 sm:pt-12">
      <header>
        <p className="micro-label text-accent">For brands and shops</p>
        <h1 className="mt-2 text-balance text-[2.375rem] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[3rem]">
          Put your brand on a day of Sorza Daily.
        </h1>
        <p className="mt-4 max-w-[52ch] text-[1rem] leading-relaxed text-muted">
          Every day, SORZA members enter a photo challenge with their cars and vote for the best one. Sponsor a day and
          your name, your prize and your link are part of it, from the morning notification to the winner&apos;s post.
        </p>
        <a
          href={MAILTO}
          className="pressable mt-6 inline-flex h-12 items-center rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground"
        >
          Book a day
        </a>
      </header>

      <section>
        <p className="micro-label mb-3 text-muted">What it looks like (example)</p>
        <ChallengeHero
          icon="engine"
          coverUrl={null}
          title="Cleanest Engine Bay"
          description="Pop the hood. Show the cleanest, best-detailed engine bay you've got."
          endsAt={exampleEnds}
          isOpen
          exampleClock="14:32:07"
          number={12}
          sponsor={{ name: "Your Brand", url: null, logoUrl: null }}
          prize="Your product or service"
          prizePoints={DAILY_POINTS.place[1]}
          stats={[
            { label: "Entries", value: "—" },
            { label: "Votes", value: "—" },
            { label: "Winner", value: `+${DAILY_POINTS.place[1]} pts`, accent: true },
          ]}
        />
      </section>

      <section>
        <h2 className="text-[1.5rem] font-bold tracking-[-0.02em]">What you get</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {GETS.map((g) => (
            <li key={g.title} className="glass-raised elev-1 rounded-[20px] p-4">
              <p className="text-[1rem] font-semibold">{g.title}</p>
              <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">{g.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-[1.5rem] font-bold tracking-[-0.02em]">How it works</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="numeral flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/12 text-[0.9375rem] text-accent">
                {i + 1}
              </span>
              <div>
                <p className="text-[1rem] font-semibold">{s.title}</p>
                <p className="mt-0.5 text-[0.875rem] leading-relaxed text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass-raised elev-2 rounded-[24px] p-6 text-center">
        <h2 className="text-balance text-[1.5rem] font-bold tracking-[-0.02em]">Want a day?</h2>
        <p className="mx-auto mt-2 max-w-[44ch] text-[0.9375rem] leading-relaxed text-muted">
          Email us with your brand and the prize you&apos;d like to give. We&apos;ll find a day that fits.
        </p>
        <a
          href={MAILTO}
          className="pressable mt-5 inline-flex h-12 items-center rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground"
        >
          {CONTACT}
        </a>
      </section>
    </div>
  );
}
