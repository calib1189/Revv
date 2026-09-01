"use client";

/**
 * Tiny hand-rolled Web Audio sound engine for the rating reveal — plain
 * oscillators with gain envelopes, no audio files and no new dependency
 * (same "hand-roll it" approach as the particle burst and the editor's
 * canvas work elsewhere in this codebase). Every method no-ops safely if
 * AudioContext isn't available or the browser blocks it — sound is a
 * bonus on top of the animation, never something its absence should
 * break.
 */
export class RevealSoundEngine {
  private ctx: AudioContext | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private rumbleOsc: OscillatorNode | null = null;
  private rumbleGain: GainNode | null = null;

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

  /** One continuous soft tone that starts the moment the climb does and
   * rises in pitch as `updateClimbPitch` is fed the currently displayed
   * score every frame — a smooth "spinning up" hum instead of a
   * repeated tick, which would fight with how smooth the visual climb
   * itself already is. */
  startClimbHum() {
    const ctx = this.getContext();
    if (!ctx || this.humOsc) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    this.humOsc = osc;
    this.humGain = gain;

    // A low rumble underneath the rising hum — "the machine is working"
    // texture. Deliberately held near-fixed rather than climbing with
    // the hum, so it reads as a floor the sound sits on rather than a
    // second rising tone competing with the one that's actually meant
    // to carry the climb.
    const rOsc = ctx.createOscillator();
    const rGain = ctx.createGain();
    rOsc.type = "sawtooth";
    rOsc.frequency.setValueAtTime(42, ctx.currentTime);
    rGain.gain.setValueAtTime(0, ctx.currentTime);
    rGain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.8);
    rOsc.connect(rGain);
    rGain.connect(ctx.destination);
    rOsc.start();
    this.rumbleOsc = rOsc;
    this.rumbleGain = rGain;
  }

  updateClimbPitch(score0to100: number) {
    const ctx = this.ctx;
    if (!ctx || !this.humOsc) return;
    const clamped = Math.max(0, Math.min(100, score0to100));
    const freq = 150 + clamped * 3.2; // 150Hz climbing toward ~470Hz
    this.humOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.1);
  }

  stopClimbHum() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.humOsc && this.humGain) {
      const osc = this.humOsc;
      const gain = this.humGain;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.stop(ctx.currentTime + 0.4);
      this.humOsc = null;
      this.humGain = null;
    }
    if (this.rumbleOsc && this.rumbleGain) {
      const osc = this.rumbleOsc;
      const gain = this.rumbleGain;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.stop(ctx.currentTime + 0.4);
      this.rumbleOsc = null;
      this.rumbleGain = null;
    }
  }

  /** Short two-note chime on every tier crossing, pitched higher for
   * higher tiers so climbing further up the ladder audibly feels
   * bigger, not just visually — `rank` is 0 (lowest tier) through
   * `totalTiers - 1` (highest). */
  playLevelUp(rank: number, totalTiers: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = 480 + (rank / Math.max(1, totalTiers - 1)) * 420;
    this.tone(base, now, 0.18, { type: "triangle", gain: 0.1 });
    this.tone(base * 1.5, now + 0.08, 0.2, { type: "triangle", gain: 0.08 });
  }

  /** A brief "holding its breath" moment right before landing — a slow
   * pitch bend on the same climbing hum rather than a new sound, so it
   * reads as tension building toward the landing chord instead of an
   * unrelated cue. */
  playAnticipationRiser(durationSec: number) {
    const ctx = this.ctx;
    if (!ctx || !this.humOsc) return;
    const now = ctx.currentTime;
    const current = this.humOsc.frequency.value;
    this.humOsc.frequency.cancelScheduledValues(now);
    this.humOsc.frequency.setValueAtTime(current, now);
    this.humOsc.frequency.linearRampToValueAtTime(current * 1.15, now + durationSec);
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

  /** The final landing moment — a small ascending major chord.
   * `rank`/`totalTiers` scale how big the hit feels — bronze gets the
   * base chord, cosmic gets that same chord plus an extra ringing
   * octave on top and more of it, so the actual highest tier is the
   * biggest-sounding landing, not every tier hitting identically. */
  playLanding(rank = 0, totalTiers = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const intensity = rank / Math.max(1, totalTiers - 1);
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    chord.forEach((freq, i) => {
      this.tone(freq, now + i * 0.09, 0.65 + intensity * 0.35, {
        type: "triangle",
        gain: 0.12 + intensity * 0.05,
      });
    });
    if (intensity > 0.6) {
      // The top few tiers ring on with one more note above the chord,
      // a beat later — the "cinematic" tail the base chord alone doesn't
      // have room for.
      this.tone(1568.0, now + 0.32, 0.9, { type: "sine", gain: 0.1 + intensity * 0.06 });
    }
  }

  dispose() {
    this.stopClimbHum();
    if (this.ctx) {
      const ctx = this.ctx;
      this.ctx = null;
      void ctx.close().catch(() => {});
    }
  }
}
