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
    if (!ctx || !this.humOsc || !this.humGain) return;
    const osc = this.humOsc;
    const gain = this.humGain;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.4);
    this.humOsc = null;
    this.humGain = null;
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

  /** The final landing moment — a small ascending major chord. */
  playLanding() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    chord.forEach((freq, i) => {
      this.tone(freq, now + i * 0.09, 0.65, { type: "triangle", gain: 0.12 });
    });
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
