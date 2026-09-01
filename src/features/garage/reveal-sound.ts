"use client";

import type { RankTier } from "@/lib/rating/rank";

// A short, bouncy major arpeggio — the "coin-line" plucked melody a real
// slot machine loops while the reels spin — ping-ponging C5-E5-G5-C6 and
// back down rather than climbing in one direction, so the loop itself
// doesn't telegraph where it starts and ends.
const MUSIC_PATTERN = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25];
const MUSIC_STEP_SEC = 0.15;
// How far ahead of the audio clock notes get scheduled on each
// updateClimbMusic call — long enough that a slow frame never leaves a
// gap in the loop, short enough that the loop can still be faded out and
// torn down (stopClimbMusic) without much already-queued material left
// to ring out.
const MUSIC_LOOKAHEAD_SEC = 0.2;

/**
 * Tiny hand-rolled Web Audio sound engine for the rating reveal — plain
 * oscillators with gain envelopes, no audio files and no new dependency
 * (same "hand-roll it" approach as the particle burst and the editor's
 * canvas work elsewhere in this codebase). Every method no-ops safely if
 * AudioContext isn't available or the browser blocks it — sound is a
 * bonus on top of the animation, never something its absence should
 * break.
 *
 * Most methods here fire a short, self-contained sound and then go quiet
 * — the tier-crossing chime, the correction blip, and the per-tier
 * landing sounds all work this way. The one exception is the climb
 * music (startClimbMusic/updateClimbMusic/stopClimbMusic): an actual
 * looping arcade-style arpeggio, not a held tone — this reveal used to
 * run a continuous engine-hum drone here, which is exactly what a bare
 * oscillator's pitch/gain envelope always ends up sounding like no
 * matter how it's shaped. A real slot machine loops a short melodic
 * phrase instead, so this schedules one directly on the Web Audio clock
 * (a lookahead scheduler, not setInterval — a JS timer alone drifts and
 * stutters against the audio clock) rather than trying to synthesize
 * "music-ness" out of a single swelling tone.
 */
export class RevealSoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private musicNextNoteTime = 0;
  private musicStepIndex = 0;
  private musicRunning = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  /** A single short tone with a punchy linear attack and an exponential
   * decay — the one building block every sound in this file is made
   * from. Routes to `opts.destination` when given (the climb music's
   * notes route through its own gain node so the loop's volume can be
   * swelled independent of every other sound) or straight to the
   * speakers otherwise, same as before. */
  private tone(
    freq: number,
    startTime: number,
    duration: number,
    opts: { type?: OscillatorType; gain?: number; destination?: AudioNode } = {},
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    const peak = opts.gain ?? 0.12;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(opts.destination ?? ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /** A tone whose pitch sweeps from `freqFrom` to `freqTo` over its own
   * duration — the "energy zap"/riser shape a handful of the tier
   * sounds below reuse, always as its own short self-contained
   * oscillator rather than bending an oscillator that's already
   * playing something else. */
  private sweep(
    freqFrom: number,
    freqTo: number,
    startTime: number,
    duration: number,
    opts: { type?: OscillatorType; gain?: number } = {},
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freqFrom, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), startTime + duration);
    const peak = opts.gain ?? 0.1;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /** One step of the arpeggio plus, every third step, a low "chick" bass
   * note underneath it — the "boom-chick" backing that keeps the melody
   * from feeling like a bare sequence of plucks. Both route through
   * `musicGain` rather than straight to the speakers, so their combined
   * volume is what updateClimbMusic actually swells. */
  private scheduleMusicStep(step: number, time: number) {
    if (!this.musicGain) return;
    this.tone(MUSIC_PATTERN[step], time, 0.16, { type: "triangle", gain: 0.1, destination: this.musicGain });
    if (step % 3 === 0) {
      this.tone(130.81, time, 0.22, { type: "sine", gain: 0.16, destination: this.musicGain });
    }
  }

  /** Starts the climb music loop — silent until the first
   * updateClimbMusic call ramps its gain up, at which point notes are
   * already scheduled and playing right on the beat. Safe to call again
   * while already running — it no-ops rather than layering a second
   * loop underneath. */
  startClimbMusic() {
    const ctx = this.getContext();
    if (!ctx || this.musicRunning) return;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.connect(ctx.destination);
    this.musicGain = gain;
    this.musicNextNoteTime = ctx.currentTime;
    this.musicStepIndex = 0;
    this.musicRunning = true;
  }

  /** Keeps the loop's notes scheduled a short window ahead of the audio
   * clock and swells its overall volume toward wherever the climb
   * currently sits — `progress` is 0 (climb just started) to 1 (right at
   * the real score's ceiling). Meant to be called every animation frame
   * from the reveal's RAF loop; scheduling off the Web Audio clock
   * rather than off those calls' own timing is what keeps the tempo
   * steady even if a frame or two runs late. */
  updateClimbMusic(progress: number) {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || !this.musicRunning) return;
    const p = Math.min(1, Math.max(0, progress));
    const now = ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(0.02 + p * 0.045, now, 0.2);
    while (this.musicNextNoteTime < now + MUSIC_LOOKAHEAD_SEC) {
      this.scheduleMusicStep(this.musicStepIndex, this.musicNextNoteTime);
      this.musicStepIndex = (this.musicStepIndex + 1) % MUSIC_PATTERN.length;
      this.musicNextNoteTime += MUSIC_STEP_SEC;
    }
  }

  /** Fades the loop out and stops scheduling further notes — called
   * right as the reveal locks in its final tier, so the music cuts away
   * just before playRankLocked's impact rather than the two overlapping.
   * Whatever's already scheduled inside the lookahead window rings out
   * naturally rather than being yanked. */
  stopClimbMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain || !this.musicRunning) return;
    this.musicRunning = false;
    const now = ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
    this.musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
    this.musicGain = null;
  }

  /** Short two-note chime on every tier crossing during the climb —
   * pitched *and* louder for higher tiers, so climbing further up the
   * ladder audibly feels bigger, not just visually. Quick and
   * lightweight throughout — the real weight belongs to
   * playRankLocked, not here. `rank` is 0 (lowest tier) through
   * `totalTiers - 1` (highest). */
  playLevelUp(rank: number, totalTiers: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const intensity = rank / Math.max(1, totalTiers - 1);
    const base = 480 + intensity * 420;
    this.tone(base, now, 0.16, { type: "triangle", gain: 0.07 + intensity * 0.05 });
    this.tone(base * 1.5, now + 0.07, 0.18, { type: "triangle", gain: 0.05 + intensity * 0.04 });
  }

  /** A brief, self-contained "holding its breath" moment right before
   * landing — a short rising sweep rather than bending a continuous
   * tone that no longer exists. */
  playAnticipationRiser(durationSec: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.sweep(320, 460, now, durationSec, { type: "sine", gain: 0.05 });
  }

  /** A quiet descending blip — the sound of the number correcting back
   * down toward where it actually needs to land, distinct from (and
   * much less exciting than) the ascending tier-crossing chime, so a
   * correction reads as "the system settling on the real number," not
   * another achievement. */
  playCorrection() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.5);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  /** The final "rank locked" moment — a distinct sound per tier rather
   * than one shape scaled by intensity, so bronze and cosmic are
   * actually different sounds, not the same chord played louder. Each
   * one only ever plays for the tier the build actually landed on —
   * cosmic's own big finish, for instance, only ever fires when the
   * real final score is 95+, since this is called exactly once, with
   * exactly the tier that was actually reached. */
  playRankLocked(tier: RankTier) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    switch (tier) {
      case "bronze":
        // Subtle metallic/UI confirmation.
        this.tone(330, now, 0.22, { type: "triangle", gain: 0.09 });
        break;

      case "copper":
        // Slightly stronger metallic impact — two close tones instead
        // of bronze's one.
        this.tone(350, now, 0.2, { type: "triangle", gain: 0.1 });
        this.tone(440, now + 0.05, 0.22, { type: "triangle", gain: 0.08 });
        break;

      case "iron":
        // Deep metallic confirmation — lower and longer, a harder
        // waveform for a harder metal.
        this.tone(180, now, 0.4, { type: "sawtooth", gain: 0.1 });
        this.tone(270, now + 0.02, 0.3, { type: "triangle", gain: 0.06 });
        break;

      case "silver":
        // Clean crystalline/metallic impact — a bright, pure interval,
        // no harsh waveforms.
        this.tone(660, now, 0.28, { type: "sine", gain: 0.11 });
        this.tone(990, now + 0.03, 0.3, { type: "triangle", gain: 0.08 });
        break;

      case "gold":
        // A more powerful, premium impact — a three-note ascending
        // motif instead of a single hit.
        this.tone(523.25, now, 0.3, { type: "triangle", gain: 0.12 });
        this.tone(659.25, now + 0.08, 0.3, { type: "triangle", gain: 0.12 });
        this.tone(784.0, now + 0.16, 0.45, { type: "triangle", gain: 0.13 });
        break;

      case "platinum":
        // A strong, polished impact with a subtle shimmer trailing it.
        this.tone(440, now, 0.4, { type: "triangle", gain: 0.14 });
        this.tone(880, now + 0.02, 0.35, { type: "sine", gain: 0.08 });
        [1760, 2093, 2489].forEach((freq, i) => {
          this.tone(freq, now + 0.22 + i * 0.05, 0.25, { type: "sine", gain: 0.035 });
        });
        break;

      case "emerald": {
        // A distinct energetic/green-toned crystalline sound — two
        // slightly detuned tones beating against each other for an
        // "electric" texture, plus a bright crystalline cap.
        this.tone(700, now, 0.4, { type: "sawtooth", gain: 0.09 });
        this.tone(714, now, 0.4, { type: "sawtooth", gain: 0.09 });
        this.tone(1400, now + 0.06, 0.3, { type: "sine", gain: 0.07 });
        break;
      }

      case "diamond":
        // A powerful crystalline impact with a deep bass hit underneath
        // it — the first tier with real low-end weight.
        this.tone(70, now, 0.5, { type: "sine", gain: 0.16 });
        this.tone(900, now + 0.01, 0.5, { type: "triangle", gain: 0.12 });
        this.tone(1350, now + 0.04, 0.45, { type: "sine", gain: 0.09 });
        break;

      case "ruby":
        // A very powerful, cinematic impact — a bigger, harder-edged
        // chord plus a short rising energy-zap layered on top of it.
        [523.25, 659.25, 830.61].forEach((freq, i) => {
          this.tone(freq, now + i * 0.05, 0.75, { type: "sawtooth", gain: 0.12 });
        });
        this.tone(50, now, 0.5, { type: "sine", gain: 0.14 });
        this.sweep(220, 1400, now + 0.05, 0.22, { type: "sawtooth", gain: 0.09 });
        break;

      case "cosmic":
        // The biggest finish in the ladder — a deep hit, the widest
        // chord, and a shimmering high arpeggio trailing after it.
        this.tone(45, now, 0.9, { type: "sine", gain: 0.18 });
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          this.tone(freq, now + i * 0.09, 1.1, { type: "triangle", gain: 0.15 });
        });
        [1568.0, 1975.5, 2349.3, 2793.0].forEach((freq, i) => {
          this.tone(freq, now + 0.5 + i * 0.09, 0.5, { type: "sine", gain: 0.06 });
        });
        break;
    }
  }

  dispose() {
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      this.musicGain = null;
      this.musicRunning = false;
      void ctx.close().catch(() => {});
    }
  }
}
