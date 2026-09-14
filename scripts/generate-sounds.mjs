// Generates a starter catalog of original instrumental loops for the Sounds
// feature and seeds them into Supabase (storage + the `sounds` table).
//
// Every note is synthesized here from scratch (sine/triangle oscillators +
// simple envelopes, mixed to a 16-bit PCM WAV) — no external audio files are
// downloaded or embedded, so there is zero copyright question about any of
// it. These are intentionally simple loops, not produced songs: a real
// "songs" catalog is meant to grow from admin-added licensed tracks and
// member uploads (the SoundUploadForm feature), not from this script.
//
// Usage: node scripts/generate-sounds.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in the
// environment (already in .env.local) and the sounds table migration
// (0083_sounds.sql) already applied.

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
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const SAMPLE_RATE = 44100;

// ---- Tiny synth engine ------------------------------------------------

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Linear ADSR envelope value at time t (seconds) into a note of the given
 * total duration. */
function envelope(t, duration, attack, release, sustainLevel = 0.85) {
  if (t < attack) return t / attack;
  const releaseStart = duration - release;
  if (t > releaseStart) {
    const releaseT = (t - releaseStart) / release;
    return Math.max(0, sustainLevel * (1 - releaseT));
  }
  return sustainLevel;
}

/** Adds a sustained chord/pad voice (a set of MIDI notes) into `buffer`
 * starting at `startSec`, for `duration` seconds, at `gain`. A light
 * second harmonic (half amplitude, one octave up) gives the sine a less
 * clinical, slightly warmer timbre without needing real sample data. */
function addPad(buffer, startSec, duration, midiNotes, gain) {
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const perNoteGain = gain / midiNotes.length;
  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;
    const t = i / SAMPLE_RATE;
    const env = envelope(t, duration, 0.08, Math.min(0.6, duration * 0.3));
    let sample = 0;
    for (const midi of midiNotes) {
      const freq = midiToFreq(midi);
      sample += Math.sin(2 * Math.PI * freq * t) * 0.75;
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.25;
    }
    buffer[idx] += sample * perNoteGain * env;
  }
}

/** A single plucked/arpeggiated note — shorter envelope than a pad, a
 * triangle-ish wave (sine + third harmonic) for a brighter, more
 * "plucked" character. */
function addPluck(buffer, startSec, duration, midi, gain) {
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const freq = midiToFreq(midi);
  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;
    const t = i / SAMPLE_RATE;
    const env = envelope(t, duration, 0.01, duration * 0.7, 0.6);
    const sample =
      Math.sin(2 * Math.PI * freq * t) * 0.8 + Math.sin(2 * Math.PI * freq * 3 * t) * 0.15;
    buffer[idx] += sample * gain * env;
  }
}

/** A bass note — fundamental plus a sub-octave for weight. */
function addBass(buffer, startSec, duration, midi, gain) {
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  const freq = midiToFreq(midi);
  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;
    const t = i / SAMPLE_RATE;
    const env = envelope(t, duration, 0.01, duration * 0.4, 0.9);
    const sample =
      Math.sin(2 * Math.PI * freq * t) * 0.6 + Math.sin(2 * Math.PI * (freq / 2) * t) * 0.4;
    buffer[idx] += sample * gain * env;
  }
}

/** A pitch-dropping kick — a sine sweeping from ~150Hz down to ~45Hz over
 * 140ms with a fast exponential decay, the standard cheap synthesized kick. */
function addKick(buffer, startSec, gain) {
  const duration = 0.16;
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;
    const t = i / SAMPLE_RATE;
    const freq = 150 * Math.pow(45 / 150, t / duration);
    const env = Math.exp(-t * 18);
    buffer[idx] += Math.sin(2 * Math.PI * freq * t) * gain * env;
  }
}

/** A short filtered-ish noise burst for a hi-hat — true filtering would
 * need an actual biquad; a very short, fast-decaying burst of raw noise
 * reads as a closed hi-hat closely enough at this length. */
function addHat(buffer, startSec, gain) {
  const duration = 0.045;
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const numSamples = Math.floor(duration * SAMPLE_RATE);
  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i;
    if (idx >= buffer.length) break;
    const t = i / SAMPLE_RATE;
    const env = Math.exp(-t * 90);
    buffer[idx] += (Math.random() * 2 - 1) * gain * env;
  }
}

function floatTo16BitPCM(float32) {
  const out = Buffer.alloc(float32.length * 2);
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]));
    // Soft knee above 0.8 instead of a hard clip — the mix here can add
    // several voices at once and a hard clip on that is audibly harsh.
    if (s > 0.8) s = 0.8 + (s - 0.8) * 0.3;
    if (s < -0.8) s = -0.8 + (s + 0.8) * 0.3;
    out.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  return out;
}

function encodeWav(float32) {
  const pcm = floatTo16BitPCM(float32);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate (mono, 16-bit)
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// ---- Music theory helpers ----------------------------------------------

const ROOT_NOTES = { C: 60, D: 62, E: 64, F: 65, G: 67, A: 69, Bb: 70 };

// Each degree is a semitone offset from the root; chords are built as
// stacked thirds off these scale degrees, minor by default (the "mood"
// tracks lean moodier/driving rather than major-key-cheerful, which fits
// a car-culture app better than generic upbeat stock-music major chords).
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
function chordAt(rootMidi, scale, degreeIndex, octaveShift = 0) {
  const degree = (i) => scale[((degreeIndex + i) % scale.length + scale.length) % scale.length];
  const base = rootMidi + 12 * octaveShift;
  return [base + degree(0), base + degree(2), base + degree(4)];
}

// i - VI - III - VII style minor progressions, expressed as scale-degree
// indices — a handful of different orderings for variety across tracks.
const PROGRESSIONS = [
  [0, 5, 2, 4],
  [0, 3, 4, 0],
  [0, 4, 5, 3],
  [5, 3, 0, 4],
];

const MOODS = [
  { name: "Late Night Cruise", bpm: 84, withDrums: false, withArp: true },
  { name: "Open Road", bpm: 100, withDrums: true, withArp: false },
  { name: "Garage Session", bpm: 112, withDrums: true, withArp: true },
  { name: "Track Day", bpm: 132, withDrums: true, withArp: true },
  { name: "Sunset Drive", bpm: 90, withDrums: false, withArp: true },
];

function buildTrack({ rootName, rootMidi, mood, progression, bars = 8 }) {
  const beatSec = 60 / mood.bpm;
  const barSec = beatSec * 4;
  const totalSec = barSec * bars + 1; // +1s tail for the final release
  const buffer = new Float32Array(Math.ceil(totalSec * SAMPLE_RATE));

  for (let bar = 0; bar < bars; bar++) {
    const degreeIndex = progression[bar % progression.length];
    const chord = chordAt(rootMidi, MINOR_SCALE, degreeIndex, -1);
    const barStart = bar * barSec;

    addPad(buffer, barStart, barSec + 0.4, chord.map((n) => n + 12), 0.5);
    addBass(buffer, barStart, barSec * 0.95, chord[0] - 12, 0.55);

    if (mood.withArp) {
      const arpNotes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 12];
      for (let step = 0; step < 4; step++) {
        addPluck(buffer, barStart + step * beatSec, beatSec * 0.9, arpNotes[step], 0.22);
      }
    }

    if (mood.withDrums) {
      addKick(buffer, barStart, 0.7);
      addKick(buffer, barStart + beatSec * 2, 0.6);
      addHat(buffer, barStart + beatSec * 0.5, 0.15);
      addHat(buffer, barStart + beatSec * 1.5, 0.15);
      addHat(buffer, barStart + beatSec * 2.5, 0.15);
      addHat(buffer, barStart + beatSec * 3.5, 0.15);
    }
  }

  return { buffer, durationSec: totalSec };
}

// ---- Build the catalog: 5 moods x 4 keys/progressions = 20 tracks ----

const KEYS = Object.entries(ROOT_NOTES);

function buildCatalog() {
  const tracks = [];
  for (const mood of MOODS) {
    for (let variant = 0; variant < 4; variant++) {
      const [rootName, rootMidi] = KEYS[variant % KEYS.length];
      const progression = PROGRESSIONS[variant % PROGRESSIONS.length];
      const { buffer, durationSec } = buildTrack({
        rootName,
        rootMidi,
        mood,
        progression,
        bars: variant % 2 === 0 ? 8 : 6,
      });
      tracks.push({
        title: variant === 0 ? mood.name : `${mood.name} (${rootName} ${["I", "II", "III", "IV"][variant]})`,
        wav: encodeWav(buffer),
        durationMs: Math.round(durationSec * 1000),
      });
    }
  }
  return tracks;
}

// ---- Upload + seed -------------------------------------------------------

async function main() {
  if (process.argv.includes("--local-test")) {
    const { writeFileSync } = await import("node:fs");
    const tracks = buildCatalog();
    writeFileSync(join(__dirname, "test-output.wav"), tracks[0].wav);
    console.log(`Wrote ${tracks[0].title}: ${tracks[0].wav.length} bytes, ${tracks[0].durationMs}ms`);
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  const tracks = buildCatalog();
  console.log(`Generated ${tracks.length} original instrumental loops. Uploading...`);

  let succeeded = 0;
  for (const track of tracks) {
    const storagePath = `system/${crypto.randomUUID()}.wav`;
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(storagePath, track.wav, { contentType: "audio/wav", cacheControl: "31536000" });
    if (uploadError) {
      console.error(`Upload failed for "${track.title}":`, uploadError.message);
      continue;
    }

    const { error: insertError } = await supabase.from("sounds").insert({
      owner_id: null,
      title: track.title,
      artist_name: "SORZA Originals",
      storage_path: storagePath,
      duration_ms: track.durationMs,
      source: "original",
      license_label: "SORZA Original — royalty-free",
    });
    if (insertError) {
      console.error(`DB insert failed for "${track.title}":`, insertError.message);
      continue;
    }

    succeeded += 1;
    console.log(`  seeded: ${track.title}`);
  }

  console.log(`Done. ${succeeded}/${tracks.length} sounds seeded.`);
}

main();
