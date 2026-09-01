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
 * Almost every method here fires a short, self-contained sound and then
 * goes quiet — the tier-crossing chime, the correction blip, and the
 * per-tier landing sounds all work this way. The one exception is the
 * climb riser (startClimbRiser/updateClimbRiser/stopClimbRiser): a
 * continuous but quiet, evolving airy swell that tracks the climb's own
 * progress, built from filtered noise rather than a bare oscillator so
 * it reads as "building energy" (a slot machine's reels picking up
 * speed) rather than the flat, buzzy engine-hum drone this reveal used
 * to run — a plain oscillator's pitch/gain that never changes timbre is
 * exactly what made the old hum feel like a background drone; noise
 * swept through a moving filter keeps changing character as it plays,
 * which is what stops it from reading the same way.
 */
export class RevealSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private riserSource: AudioBufferSourceNode | null = null;
  private riserFilter: BiquadFilterNode | null = null;
  private riserGain: GainNode | null = null;
  private riserLfo: OscillatorNode | null = null;

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

  /** A few seconds of looping white noise, generated once per
   * AudioContext and reused by every riser start — the raw material the
   * riser's bandpass filter sweeps through to make it sound airy rather
   * than like a pitched tone. */
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  /** Starts the climb riser — looping filtered noise, silent until the
   * first updateClimbRiser call ramps it up. A slow LFO wobbles the
   * filter's center frequency the whole time it plays, so even while
   * updateClimbRiser is holding a steady value (the anticipation pause)
   * it keeps a little life to it instead of sitting on one frozen tone.
   * Safe to call again while already running — it no-ops rather than
   * layering a second one underneath. */
  startClimbRiser() {
    const ctx = this.getContext();
    if (!ctx || this.riserSource) return;
    const now = ctx.currentTime;

    const source = ctx.createBufferSource();
    source.buffer = this.getNoiseBuffer(ctx);
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(150, now);
    filter.Q.setValueAtTime(1.1, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.5, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(35, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    lfo.start(now);

    this.riserSource = source;
    this.riserFilter = filter;
    this.riserGain = gain;
    this.riserLfo = lfo;
  }

  /** Moves the riser's filter sweep and volume toward wherever the climb
   * currently sits — `progress` is 0 (climb just started) to 1 (right at
   * the real score's ceiling). Smoothly targeted rather than snapped, so
   * many calls a second from the reveal's RAF loop sound like one
   * continuous swell, not a stutter of little jumps. */
  updateClimbRiser(progress: number) {
    if (!this.riserFilter || !this.riserGain || !this.ctx) return;
    const p = Math.min(1, Math.max(0, progress));
    const now = this.ctx.currentTime;
    this.riserFilter.frequency.setTargetAtTime(150 + p * 1600, now, 0.15);
    this.riserGain.gain.setTargetAtTime(0.0001 + p * 0.05, now, 0.15);
  }

  /** Fades the riser out and tears it down — called right as the reveal
   * locks in its final tier, so the swell cuts away just before
   * playRankLocked's impact rather than the two overlapping. */
  stopClimbRiser() {
    const ctx = this.ctx;
    if (!ctx || !this.riserSource || !this.riserGain || !this.riserLfo) return;
    const now = ctx.currentTime;
    this.riserGain.gain.cancelScheduledValues(now);
    this.riserGain.gain.setValueAtTime(this.riserGain.gain.value, now);
    this.riserGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
    this.riserSource.stop(now + 0.15);
    this.riserLfo.stop(now + 0.15);
    this.riserSource = null;
    this.riserFilter = null;
    this.riserGain = null;
    this.riserLfo = null;
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
      this.riserSource = null;
      this.riserFilter = null;
      this.riserGain = null;
      this.riserLfo = null;
      void ctx.close().catch(() => {});
    }
  }
}
