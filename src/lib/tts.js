/** Helpers de síntesis de voz (Web Speech API) con quirks de iOS. */

// Preferencias de región por idioma base (en orden)
const LANG_PREFS = {
  es: ["es-ES", "es-MX", "es-US"],
  en: ["en-US", "en-GB"],
  fr: ["fr-FR"],
};

const LANG_FALLBACK = { es: "es-ES", en: "en-US", fr: "fr-FR" };

const norm = (v) => String(v || "").toLowerCase().replace("_", "-");
const baseOf = (lang) => norm(lang).split("-")[0] || "es";

/** BCP-47 completo para el utterance según el código corto del catálogo. */
export function utteranceLang(lang = "es") {
  const base = baseOf(lang);
  return LANG_FALLBACK[base] || (norm(lang).includes("-") ? norm(lang) : base);
}

/** Elige la mejor voz instalada para el idioma del libro ("es" | "en" | ...). */
export function pickVoice(lang = "es") {
  const voices = window.speechSynthesis?.getVoices() || [];
  const base = baseOf(lang);
  const matching = voices.filter((v) => norm(v.lang).split("-")[0] === base);
  if (!matching.length) return null;
  for (const pref of LANG_PREFS[base] || []) {
    const hit = matching.find((v) => norm(v.lang) === pref.toLowerCase());
    if (hit) return hit;
  }
  return matching.find((v) => v.default) || matching[0];
}

/** Compat: versión anterior fijada a español. */
export function pickSpanishVoice() {
  return pickVoice("es");
}

/**
 * iOS Safari exige que el primer speak() ocurra dentro de un gesto del
 * usuario. Esta "llave" pronuncia un punto casi inaudible para desbloquear
 * la cola de síntesis; llamar solo desde handlers de click/tap.
 */
export function unlockTTS() {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(".");
  u.volume = 0.01;
  window.speechSynthesis.speak(u);
}
