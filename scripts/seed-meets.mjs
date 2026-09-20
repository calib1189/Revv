// Seeds a handful of demo meets so Discover isn't empty while recording an
// App Store preview, and removes them again on demand.
//
// These are REAL ROWS IN THE LIVE DATABASE, visible to anyone who opens the
// app. That is the whole point (an App Store preview must show real in-app
// footage, not a mockup), but it is also why this script is built the way it
// is:
//
//   - Fixed ids. Every meet is created with a hardcoded UUID, so --clean
//     deletes exactly these four rows and can never touch a real meet
//     somebody actually posted.
//   - No coordinates. lat/lng are left null, so nothing renders a distance
//     and no one can navigate to a place that doesn't exist. Locations are
//     deliberately generic and match no real address.
//   - Dated weeks out. Nothing is ever "this weekend", so even if cleanup is
//     forgotten, nobody turns up somewhere expecting a meet tomorrow.
//
// Usage:
//   node scripts/seed-meets.mjs            create them
//   node scripts/seed-meets.mjs --clean    remove them again
//
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in
// .env.local. The service role is needed to insert rows already at
// status 'active': RLS deliberately has no path for a host to publish
// their own meet (0043/0090), and that rule is worth keeping intact even
// for demo data.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Fixed so --clean is exact. The 5ee9-prefixed block is arbitrary but
// distinctive enough to recognise in the table at a glance.
const MEETS = [
  {
    id: "5ee90000-0000-4000-8000-000000000001",
    title: "Cars & Coffee",
    location_name: "Downtown parking deck, level 3",
    description:
      "Early start, coffee's on. Everything welcome — daily drivers, project cars, works in progress.",
    daysOut: 18,
    hour: 8,
  },
  {
    id: "5ee90000-0000-4000-8000-000000000002",
    title: "Sunset Cruise",
    location_name: "Riverside lot",
    description: "Meet at the lot, roll out together an hour before sunset. Easy pace, no racing.",
    daysOut: 20,
    hour: 18,
  },
  {
    id: "5ee90000-0000-4000-8000-000000000003",
    title: "Track Day — Open Lapping",
    location_name: "County motorsport park",
    description: "Open lapping, run what you brought. Helmets required, tech inspection on arrival.",
    daysOut: 22,
    hour: 9,
  },
  {
    id: "5ee90000-0000-4000-8000-000000000004",
    title: "Import Night",
    location_name: "Airport industrial park",
    description: "JDM and Euro heavy, but everyone's welcome. Bring the build, bring the story.",
    daysOut: 24,
    hour: 19,
  },
];

const IDS = MEETS.map((m) => m.id);

async function clean() {
  // meetup_media first: the FK may or may not cascade depending on how
  // 0018 declared it, and a leftover join row pointing at a deleted meet
  // is worse than an extra query.
  await supabase.from("meetup_media").delete().in("meetup_id", IDS);
  const { error } = await supabase.from("meetups").delete().in("id", IDS);
  if (error) throw error;
  console.log(`Removed ${IDS.length} demo meets and their photo links.`);
  console.log("The photos themselves are untouched — they belong to the host's cars.");
}

/** The account being filmed — whoever has the most cars with a chosen
 * hero photo. That's the real account with real content, rather than a
 * hardcoded username or whichever admin row happens to sort first (which
 * picked an empty test account). Override with --host=username. */
async function resolveHost() {
  const explicit = process.argv.find((a) => a.startsWith("--host="))?.slice("--host=".length);
  if (explicit) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", explicit)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`No profile named ${explicit}.`);
    return data;
  }

  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("owner_id")
    .not("hero_media_id", "is", null);
  if (error) throw error;

  const counts = new Map();
  for (const v of vehicles) counts.set(v.owner_id, (counts.get(v.owner_id) ?? 0) + 1);
  const [topOwner] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!topOwner) throw new Error("No profile with a photographed vehicle to host these meets.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", topOwner)
    .single();
  return profile;
}

/** A meet card with no photo is ~180px of empty space, which looks
 * broken on camera. Rather than inventing imagery, each demo meet reuses
 * one of the host's OWN vehicle hero photos — their content, already
 * curated as the best shot of that car, and unambiguously theirs to
 * reuse. Only the host's own media is ever touched. */
async function attachPhotos(hostId) {
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("hero_media_id")
    .eq("owner_id", hostId)
    .not("hero_media_id", "is", null);
  if (error) throw error;

  const heroIds = vehicles.map((v) => v.hero_media_id);
  if (heroIds.length === 0) {
    console.log("Host has no vehicle photos — meets seeded without imagery.");
    return 0;
  }

  await supabase.from("meetup_media").delete().in("meetup_id", IDS);
  const rows = MEETS.map((m, i) => ({
    meetup_id: m.id,
    media_id: heroIds[i % heroIds.length],
    position: 0,
  }));
  const { error: insertError } = await supabase.from("meetup_media").insert(rows);
  if (insertError) throw insertError;
  return heroIds.length;
}

async function seed() {
  const host = await resolveHost();
  if (!host) {
    console.error("No profile found to host these meets.");
    process.exit(1);
  }

  const rows = MEETS.map((m) => {
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + m.daysOut);
    startsAt.setHours(m.hour, 0, 0, 0);
    return {
      id: m.id,
      host_id: host.id,
      title: m.title,
      description: m.description,
      location_name: m.location_name,
      starts_at: startsAt.toISOString(),
      // Deliberately null — see the header. No distance is rendered and
      // there is nowhere to navigate to.
      lat: null,
      lng: null,
      tier: "free",
      price_cents: 0,
      status: "active",
    };
  });

  const { error } = await supabase.from("meetups").upsert(rows, { onConflict: "id" });
  if (error) throw error;

  const photoCount = await attachPhotos(host.id);

  console.log(`Seeded ${rows.length} demo meets, hosted by @${host.username}`);
  console.log(`Photos: reused ${photoCount} of the host's own vehicle hero shots.`);
  for (const row of rows) {
    console.log(`  ${row.title} — ${row.location_name} — ${new Date(row.starts_at).toDateString()}`);
  }
  console.log("\nRemove them again with:  node scripts/seed-meets.mjs --clean");
}

const wantsClean = process.argv.includes("--clean");
try {
  await (wantsClean ? clean() : seed());
} catch (err) {
  console.error(err.message ?? err);
  process.exit(1);
}
