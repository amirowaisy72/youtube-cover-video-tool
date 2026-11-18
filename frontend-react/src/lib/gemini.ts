/**
 * Gemini acting voices (Story Animator). Google's Gemini TTS follows a
 * delivery direction per line ("shouting, furious", "whispering a secret"),
 * so characters really act instead of reading. The key is the user's own
 * (free from aistudio.google.com/apikey), stored only in this browser.
 */
export const GEMINI_KEY_STORAGE = "ytguru-gemini-tts-key";

export const GEMINI_VOICES: { id: string; label: string }[] = [
  ["Puck", "Upbeat"], ["Fenrir", "Excitable"], ["Leda", "Youthful"], ["Zephyr", "Bright"], ["Kore", "Firm"],
  ["Charon", "Informative"], ["Orus", "Firm"], ["Aoede", "Breezy"], ["Callirrhoe", "Easy-going"],
  ["Autonoe", "Bright"], ["Enceladus", "Breathy"], ["Iapetus", "Clear"], ["Umbriel", "Easy-going"],
  ["Algieba", "Smooth"], ["Despina", "Smooth"], ["Erinome", "Clear"], ["Algenib", "Gravelly"],
  ["Rasalgethi", "Informative"], ["Laomedeia", "Upbeat"], ["Achernar", "Soft"], ["Alnilam", "Firm"],
  ["Schedar", "Even"], ["Gacrux", "Mature"], ["Pulcherrima", "Forward"], ["Achird", "Friendly"],
  ["Zubenelgenubi", "Casual"], ["Vindemiatrix", "Gentle"], ["Sadachbia", "Lively"], ["Sadaltager", "Knowledgeable"],
  ["Sulafat", "Warm"],
].map(([id, kind]) => ({ id: id!, label: `${id} (${kind})` }));

export function getGeminiKey(): string {
  try {
    return localStorage.getItem(GEMINI_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setGeminiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
  } catch {
    // storage blocked: the key just won't persist
  }
}
