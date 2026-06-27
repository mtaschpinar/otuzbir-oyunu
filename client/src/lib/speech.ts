// Türkçe sesli bildirim yardımcıları (Web Speech API)

let cachedVoices: SpeechSynthesisVoice[] = [];

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

/** Türkçe metni sesli okur. Türkçe ses bulunamazsa varsayılan sesle okur. */
export function speak(text: string, enabled: boolean) {
  if (!enabled || !isSpeechSupported()) return;
  try {
    const synth = window.speechSynthesis;
    // Üst üste binmeyi önle
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "tr-TR";
    utter.rate = 1.0;
    utter.pitch = 1.05;
    const voices = loadVoices();
    const tr =
      voices.find((v) => v.lang?.toLowerCase().startsWith("tr")) ||
      voices.find((v) => v.name?.toLowerCase().includes("turkish"));
    if (tr) utter.voice = tr;
    synth.speak(utter);
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
