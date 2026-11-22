// The Velvet Vault — all sound is synthesized with WebAudio.
// No audio files: every effect is a small oscillator/noise recipe,
// so the game loads with zero network requests.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.stepFlip = false;
  }

  // Created lazily on the first user gesture (browsers require it).
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  // Soft shoe tap while sneaking; alternates pitch so it never drones.
  step() {
    this.stepFlip = !this.stepFlip;
    this._noise(0.07, 0.12, this.stepFlip ? 500 : 380);
  }

  // Bright coin-like chime when loot is pocketed.
  pickup() {
    this._tone(880, 0.12, 'sine', 0.25);
    setTimeout(() => this._tone(1318, 0.18, 'sine', 0.22), 70);
  }

  // Rising two-note alert when a watcher spots the thief.
  spotted() {
    this._tone(220, 0.16, 'square', 0.16, 330);
    setTimeout(() => this._tone(330, 0.2, 'square', 0.14, 440), 120);
  }

  // Short mechanical click for the vault dial.
  vaultClick(good) {
    this._tone(good ? 1200 : 300, 0.08, 'square', 0.18);
  }

  // Heavy clunk as the vault door swings open.
  vaultOpen() {
    this._noise(0.35, 0.3, 240);
    this._tone(90, 0.4, 'sine', 0.3, 45);
  }

  // Alarm loop tick: a short siren blip, called by the game while alarmed.
  alarmBlip() {
    this._tone(660, 0.22, 'sawtooth', 0.08, 520);
  }

  // Triumphant little arpeggio on escape.
  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this._tone(f, 0.3, 'triangle', 0.25), i * 110);
    });
  }

  // Low descending buzz when the heist fails.
  lose() {
    this._tone(220, 0.7, 'sawtooth', 0.2, 110);
  }

  // UI click for menu buttons.
  uiClick() {
    this._tone(700, 0.06, 'sine', 0.15);
  }
}
