// Türkçe sesli bildirim yardımcıları (Web Speech API)

let cachedVoices: SpeechSynthesisVoice[] = [];
let speechUnlocked = false;

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const v = window.speechSynthesis.getVoices();
  if (v && v.length) cachedVoices = v;
  return cachedVoices;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => loadVoices();
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Mobil tarayıcılarda speechSynthesis kullanıcı etkileşimi olmadan çalışmaz.
 * Bu fonksiyon ilk dokunuş/tıklamada sessiz bir utterance ile TTS motorunu uyandırır.
 * Birden fazla kez çağrılabilir, sadece ilk seferde çalışır.
 */
export function unlockSpeech() {
  if (speechUnlocked || !isSpeechSupported()) return;
  try {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance("");
    utter.volume = 0;
    utter.lang = "tr-TR";
    synth.speak(utter);
    speechUnlocked = true;
  } catch {
    /* sessizce yoksay */
  }
}

// Sayfa yüklendiğinde ilk kullanıcı etkileşiminde TTS'i uyandır
if (typeof window !== "undefined") {
  const events = ["touchstart", "touchend", "click", "pointerdown"];
  const handler = () => {
    unlockSpeech();
    events.forEach((e) => window.removeEventListener(e, handler, true));
  };
  events.forEach((e) => window.addEventListener(e, handler, { capture: true, once: false, passive: true }));
}

/** Türkçe metni sesli okur. Türkçe ses bulunamazsa varsayılan sesle okur. */
export function speak(text: string, enabled: boolean) {
  if (!enabled || !isSpeechSupported()) return;
  try {
    const synth = window.speechSynthesis;
    // iOS'ta speechSynthesis bazen "paused" kalıyor, resume ile düzelt
    if (synth.paused) {
      synth.resume();
    }
    // Üst üste binmeyi önle
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "tr-TR";
    utter.rate = 1.0;
    utter.pitch = 1.05;
    utter.volume = 1.0;
    const voices = loadVoices();
    const tr =
      voices.find((v) => v.lang?.toLowerCase().startsWith("tr")) ||
      voices.find((v) => v.name?.toLowerCase().includes("turkish"));
    if (tr) utter.voice = tr;
    synth.speak(utter);
    
    // iOS Safari bug: bazen konuşma başlamıyor, 100ms sonra tekrar dene
    setTimeout(() => {
      if (synth.paused) {
        synth.resume();
      }
    }, 100);
  } catch {
    /* sessizce yoksay */
  }
}

const SOUND_KEY = "otuzbir_sound_enabled";

export function getSoundEnabled(): boolean {
  const v = localStorage.getItem(SOUND_KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
}

// ---- Haptic (Titreşim) ----
/** Telefonu titreştirir. Desteklenmiyorsa sessizce yoksayar. */
export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* yoksay */
  }
}
