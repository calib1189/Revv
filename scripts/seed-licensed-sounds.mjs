// Adds the licensed music in scripts/licensed-sounds.json to the Sounds
// library: downloads each track from where its artist published it,
// uploads it to storage, and inserts a `sounds` row with source
// 'licensed', its genre, and the credit Creative Commons requires
// (artist, license + link, source link).
//
// Only CC0 and CC BY tracks belong in the manifest. Those are the
// licenses that allow commercial use AND putting the music behind a video.
// NoDerivatives (ND), NonCommercial (NC) and ShareAlike (SA) tracks don't
// qualify: syncing a song to a video counts as an adaptation, and SORZA is
// a commercial app. Every entry was checked on its source page.
//
// Safe to re-run: a track whose source_url is already in the table is
// skipped, so nothing is added twice.
//
// Usage:
//   node scripts/seed-licensed-sounds.mjs --dry-run   (checks, writes nothing)
//   node scripts/seed-licensed-sounds.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL (read
// from .env.local) and migration 0096_sounds_genre_credit.sql applied.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

function loadEnvLocal() {
  const text = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in process.env)) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}
loadEnvLocal();

const GENRES = new Set(["phonk", "hiphop", "electronic", "synthwave", "rock", "cinematic", "chill"]);
const LICENSES = {
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
};
// Where track files may come from: the hosts the artists publish on.
const FILE_HOSTS = new Set(["files.freemusicarchive.org", "incompetech.com"]);
const MAX_BYTES = 20 * 1024 * 1024; // same caps as a member's upload
const MAX_MS = 5 * 60 * 1000;

// ---- MP3 duration, by walking the frames (no dependency needed) --------

const BITRATES = {
  // [version][layer] -> kbps by index; v1 = MPEG-1, v2 = MPEG-2/2.5
  v1: { 1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], 2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], 3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] },
  v2: { 1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], 3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] },
};
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

function mp3DurationMs(buf) {
  let i = 0;
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "ID3") {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    i = 10 + size + (buf[5] & 0x10 ? 10 : 0);
  }
  let seconds = 0;
  let frames = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const versionBits = (buf[i + 1] >> 3) & 0x03; // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
    const layer = 4 - ((buf[i + 1] >> 1) & 0x03);
    const bitrateIndex = buf[i + 2] >> 4;
    const rateIndex = (buf[i + 2] >> 2) & 0x03;
    const padding = (buf[i + 2] >> 1) & 0x01;
    if (versionBits === 1 || layer === 4 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) {
      i++;
      continue;
    }
    const v = versionBits === 3 ? "v1" : "v2";
    const bitrate = BITRATES[v][layer][bitrateIndex] * 1000;
    const sampleRate = SAMPLE_RATES[versionBits][rateIndex];
    const samples = layer === 1 ? 384 : layer === 3 && v === "v2" ? 576 : 1152;
    const length =
      layer === 1
        ? (Math.floor((12 * bitrate) / sampleRate) + padding) * 4
        : Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
    if (length < 4) {
      i++;
      continue;
    }
    seconds += samples / sampleRate;
    frames++;
    i += length;
  }
  if (frames < 10) throw new Error("not a readable MP3");
  return Math.round(seconds * 1000);
}

// ---- Manifest checks ----------------------------------------------------

function validate(entry, n) {
  const where = `entry ${n} (${entry.title ?? "untitled"})`;
  if (!entry.title || entry.title.length > 80) throw new Error(`${where}: title must be 1–80 characters`);
  if (!entry.artist || entry.artist.length > 80) throw new Error(`${where}: artist must be 1–80 characters`);
  if (!GENRES.has(entry.genre)) throw new Error(`${where}: unknown genre "${entry.genre}"`);
  if (!(entry.license in LICENSES)) throw new Error(`${where}: license must be one of ${Object.keys(LICENSES).join(", ")}`);
  if (!/^https:\/\//.test(entry.sourceUrl ?? "")) throw new Error(`${where}: sourceUrl must be https`);
  const file = new URL(entry.fileUrl);
  if (file.protocol !== "https:" || !FILE_HOSTS.has(file.hostname)) throw new Error(`${where}: fileUrl host not allowed`);
}

// ---- Run ----------------------------------------------------------------

const manifest = JSON.parse(readFileSync(join(__dirname, "licensed-sounds.json"), "utf8"));
manifest.forEach(validate);

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const probe = await supabase.from("sounds").select("id, genre, source_url").limit(1);
if (probe.error) {
  console.error("The sounds table is missing the genre/source_url columns. Apply 0096_sounds_genre_credit.sql first.");
  process.exit(1);
}
const { data: existing, error: existingError } = await supabase
  .from("sounds")
  .select("source_url")
  .not("source_url", "is", null);
if (existingError) throw existingError;
const already = new Set(existing.map((r) => r.source_url));

let added = 0;
let skipped = 0;
let failed = 0;
for (const entry of manifest) {
  const label = `${entry.title} — ${entry.artist}`;
  if (already.has(entry.sourceUrl)) {
    skipped++;
    console.log(`skip   ${label} (already in the library)`);
    continue;
  }
  try {
    const res = await fetch(entry.fileUrl, { headers: { "User-Agent": "SORZA sound library seeder" } });
    if (!res.ok) throw new Error(`download failed (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error(`file is ${(buf.length / 1048576).toFixed(1)}MB, over the 20MB cap`);
    const durationMs = mp3DurationMs(buf);
    if (durationMs > MAX_MS) throw new Error("longer than the 5-minute cap every sound has");
    const mins = `${Math.floor(durationMs / 60000)}:${String(Math.round((durationMs % 60000) / 1000)).padStart(2, "0")}`;

    if (DRY_RUN) {
      console.log(`ok     ${label} · ${entry.genre} · ${entry.license} · ${mins} · ${(buf.length / 1048576).toFixed(1)}MB`);
      added++;
      continue;
    }

    const storagePath = `licensed/${randomUUID()}.mp3`;
    const upload = await supabase.storage
      .from("media")
      .upload(storagePath, buf, { contentType: "audio/mpeg", cacheControl: "31536000" });
    if (upload.error) throw new Error(`upload failed: ${upload.error.message}`);

    const insert = await supabase.from("sounds").insert({
      owner_id: null,
      title: entry.title,
      artist_name: entry.artist,
      storage_path: storagePath,
      duration_ms: durationMs,
      source: "licensed",
      license_label: entry.license,
      license_url: LICENSES[entry.license],
      source_url: entry.sourceUrl,
      genre: entry.genre,
    });
    if (insert.error) {
      await supabase.storage.from("media").remove([storagePath]);
      throw new Error(`insert failed: ${insert.error.message}`);
    }
    added++;
    console.log(`added  ${label} · ${entry.genre} · ${mins}`);
  } catch (err) {
    failed++;
    console.error(`FAILED ${label}: ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\n${DRY_RUN ? "Dry run: " : ""}${added} ${DRY_RUN ? "ready" : "added"}, ${skipped} already there, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
