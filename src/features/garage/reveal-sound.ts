"use client";

import type { RankTier } from "@/lib/rating/rank";

/**
 * Tiny hand-rolled Web Audio sound engine for the rating reveal — plain
 * oscillators with gain envelopes, no audio files and no new dependency
 * (same "hand-roll it" approach as the particle burst and the editor's
 * canvas work elsewhere in this codebase). Every method no-ops safely if
 * AudioContext isn't available or the browser blocks it — sound is a
 * bonus on top of the animation, never something its absence should
 * break.
 *
 * Deliberately has no continuous tone anywhere in it — every method
 * fires a short, self-contained sound and then goes quiet. The reveal
 * used to run one long background hum the whole time the score was
 * climbing; it's gone entirely in favor of a discrete cue on each real
 * event (a climb tick, a tier crossing, the anticipation beat, a
 * correction, the final lock), with real silence in between.
 */
export class RevealSoundEngine {
  private ctx: AudioContext | null = null;

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
   * from. */
  private tone(
    freq: number,
    startTime: number,
    duration: number,
    opts: { type?: OscillatorType; gain?: number } = {},
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
    gain.connect(ctx.destination);
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

  /** A soft, low tick — the "spinning reel" texture behind the climbing
   * and landing numbers, standing in for the old continuous hum. The
   * caller fires this once per whole point the displayed number
   * crosses (rate-limited on its side so the fast early climb doesn't
   * turn it into a machine-gun clatter), so it still spaces itself out
   * further on its own as the curve decelerates into diamond/ruby and
   * the landing approach. A rounded sine rather than triangle, quiet
   * and short, so a run of these reads as a soft patter, not a click
   * track — with a little pitch jitter so it never sounds mechanical. */
  playClimbTick() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const jitter = 1 + (Math.random() - 0.5) * 0.15;
    this.tone(360 * jitter, now, 0.07, { type: "sine", gain: 0.028 });
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
      void ctx.close().catch(() => {});
    }
  }
}
