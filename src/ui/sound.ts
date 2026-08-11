/* Tiny tactile sounds — relay clicks and the ignition thunk.
   Audio context is created lazily on first user gesture; every call is
   safe to make before that (it just no-ops). */

let ac: AudioContext | null = null;

export function ensureAudio(): void {
  if (!ac) {
    try { ac = new AudioContext(); } catch { ac = null; }
  }
  if (ac && ac.state === 'suspended') void ac.resume();
}

/** Turn-signal relay tick — short filtered click. */
export function relayTick(bright = false): void {
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const flt = ac.createBiquadFilter();
  osc.type = 'square';
  osc.frequency.value = bright ? 2600 : 1700;
  flt.type = 'bandpass';
  flt.frequency.value = bright ? 2800 : 1900;
  flt.Q.value = 6;
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  osc.connect(flt).connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.05);
}

/** Ignition / power thunk — low damped knock. */
export function powerThunk(): void {
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(52, t + 0.14);
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.24);
}
