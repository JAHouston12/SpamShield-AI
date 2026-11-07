/** Ambient background music synthesised with the Web Audio API, so the site ships no audio files. */

interface Track {
  name: string;
  bpm: number;
  wave: OscillatorType;
  /** Chords as MIDI note numbers, one per bar. */
  chords: number[][];
}

export const TRACKS: Track[] = [
  { name: "Night Shift (calm pads)", bpm: 64, wave: "sine", chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]] },
  { name: "Packet Flow (arpeggio)", bpm: 96, wave: "triangle", chords: [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]] },
  { name: "Firewall (low pulse)", bpm: 80, wave: "sawtooth", chords: [[45, 52, 57], [41, 48, 53], [43, 50, 55], [40, 47, 52]] },
];

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class AmbientPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  track = 0;

  get playing() {
    return this.timer !== null;
  }

  play(track = this.track) {
    this.stop();
    this.track = track % TRACKS.length;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx ??= new Ctx();
    void this.ctx.resume();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.07;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1400;
    this.master.connect(filter).connect(this.ctx.destination);

    const t = TRACKS[this.track];
    const beat = 60 / t.bpm;
    this.step = 0;
    const tick = () => {
      const chord = t.chords[Math.floor(this.step / 8) % t.chords.length];
      if (this.step % 8 === 0) chord.forEach((n) => this.note(freq(n), beat * 8, t.wave === "sawtooth" ? "triangle" : "sine", 0.5));
      if (t.wave !== "sine" || this.step % 2 === 0) this.note(freq(chord[this.step % chord.length] + 12), beat * 0.9, t.wave, 0.35);
      this.step += 1;
    };
    tick();
    this.timer = setInterval(tick, (beat * 1000) / 2);
  }

  next() {
    this.play(this.track + 1);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      const m = this.master;
      setTimeout(() => m.disconnect(), 800);
    }
    this.master = null;
  }

  private note(hz: number, dur: number, wave: OscillatorType, level: number) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = hz;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(level, now + Math.min(0.4, dur / 4));
    env.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(env).connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }
}
