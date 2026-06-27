// Gerilim müziği - Web Audio API ile dinamik üretim (harici ses dosyası gerektirmez)
// Düşük, ritmik nabız sesi; "tense" modunda tempo ve yoğunluk artar.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let intervalId: number | null = null;
let running = false;
let tenseMode = false;
let musicEnabled = true;

const MUSIC_KEY = "otuzbir_music_enabled";

export function getMusicEnabled(): boolean {
  const v = localStorage.getItem(MUSIC_KEY);
  return v === null ? true : v === "1";
}

export function setMusicEnabled(enabled: boolean) {
  musicEnabled = enabled;
  localStorage.setItem(MUSIC_KEY, enabled ? "1" : "0");
  if (!enabled) {
    stopMusic();
  }
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.0;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

/** Tek bir nabız (kick + bas tını) çal */
function playPulse(intensity: number) {
  if (!ctx || !masterGain) return;
  const now = ctx.currentTime;

  // Bas nabız
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(tenseMode ? 90 : 65, now);
  osc.frequency.exponentialRampToValueAtTime(tenseMode ? 50 : 40, now + 0.18);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.5 * intensity, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.3);

  // Tense modda hafif tiz "tik"
  if (tenseMode) {
    const hi = ctx.createOscillator();
    const hg = ctx.createGain();
    hi.type = "triangle";
    hi.frequency.setValueAtTime(880, now);
    hg.gain.setValueAtTime(0.0001, now);
    hg.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
    hg.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    hi.connect(hg);
    hg.connect(masterGain);
    hi.start(now);
    hi.stop(now + 0.1);
  }
}

function scheduleLoop() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  const bpm = tenseMode ? 132 : 70;
  const beatMs = 60000 / bpm;
  intervalId = window.setInterval(() => {
    playPulse(tenseMode ? 1.0 : 0.7);
  }, beatMs);
}

/** Müziği başlat (kullanıcı etkileşiminden sonra çağrılmalı) */
export function startMusic() {
  if (!musicEnabled) return;
  const c = ensureCtx();
  if (!c || !masterGain) return;
  if (c.state === "suspended") c.resume();
  if (running) return;
  running = true;
  masterGain.gain.cancelScheduledValues(c.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime);
  masterGain.gain.linearRampToValueAtTime(0.22, c.currentTime + 1.2);
  scheduleLoop();
}

/** Müziği durdur */
export function stopMusic() {
  running = false;
  if (ctx && masterGain) {
    masterGain.gain.cancelScheduledValues(ctx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.4);
  }
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** Gerilim modunu aç/kapa (son 2 kişi kaldığında tempo artar) */
export function setTense(on: boolean) {
  if (tenseMode === on) return;
  tenseMode = on;
  if (running) scheduleLoop();
}

/** Kısa "kurtuldu" zafer tınısı */
export function playWinChime() {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  if (c.state === "suspended") c.resume();
  const now = c.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
  notes.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = f;
    const t = now + i * 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

/** Kaybeden için "battı" alçalan tını */
export function playLoseSound() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(330, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.9);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(now);
  osc.stop(now + 1.05);
}
