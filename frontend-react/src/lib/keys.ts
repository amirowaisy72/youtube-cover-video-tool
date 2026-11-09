/** Shared stock-media API keys (user, 2026-11-08): a key entered
    in ONE tool works in every tool automatically — never ask
    twice. The Stock tool, Music tool and Auto Video all read and
    write these same localStorage keys, so entering a Pexels or
    Pixabay key in any one of them connects it everywhere. The
    keys are free (signup at pexels.com/api and pixabay.com/api/docs)
    and are stored only in this browser, never on a server.
    FREESOUND (2026-11-08): Pixabay's API has no audio endpoint,
    so Auto Video music + transition sounds use a Freesound key
    (free at freesound.org/apiv2/apply) — same shared-key rule. */

export const PIXABAY_KEY_STORAGE = "ytguru-pixabay-key";
export const PEXELS_KEY_STORAGE = "ytguru-pexels-key";
export const FREESOUND_KEY_STORAGE = "ytguru-freesound-key";

/** Voice provider API keys (user, 2026-11-09): the narration
    voice can come from Google Cloud TTS (Chirp 3 HD), Unreal
    Speech (Kokoro) or ElevenLabs instead of the default Edge
    voice. Each key is the user's own, stored only in this
    browser, never on a server — same rule as the stock keys. */
export const TTS_KEY_STORAGE: Record<string, string> = {
  google: "ytguru-google-tts-key",
  unreal: "ytguru-unreal-speech-key",
  elevenlabs: "ytguru-elevenlabs-key",
};

export function getTtsKey(provider: string): string {
  try {
    const k = TTS_KEY_STORAGE[provider];
    return k ? localStorage.getItem(k) ?? "" : "";
  } catch {
    return "";
  }
}

export function setTtsKey(provider: string, key: string): void {
  try {
    const k = TTS_KEY_STORAGE[provider];
    if (k) localStorage.setItem(k, key.trim());
  } catch {
    // Storage blocked: the key just won't persist.
  }
}

/** Per-channel niche / topic (user, 2026-11-09): the Channel
    Setup Wizard saves the niche it was given for a channel, and
    the Auto Video tool reads it so its "Prompt for AI" suggests
    video titles that match the selected channel. Stored only in
    this browser, keyed by YouTube channel id. */
const CHANNEL_NICHE_STORAGE = "ytguru-channel-niches";

export function getChannelNiche(channelId: string): string {
  try {
    const map = JSON.parse(localStorage.getItem(CHANNEL_NICHE_STORAGE) || "{}") as Record<string, string>;
    return map[channelId] || "";
  } catch {
    return "";
  }
}

export function setChannelNiche(channelId: string, niche: string): void {
  try {
    const map = JSON.parse(localStorage.getItem(CHANNEL_NICHE_STORAGE) || "{}") as Record<string, string>;
    if (niche.trim()) map[channelId] = niche.trim();
    else delete map[channelId];
    localStorage.setItem(CHANNEL_NICHE_STORAGE, JSON.stringify(map));
  } catch {
    // Storage blocked: the niche just won't persist.
  }
}

export function getPixabayKey(): string {
  try {
    return localStorage.getItem(PIXABAY_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function getPexelsKey(): string {
  try {
    return localStorage.getItem(PEXELS_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setPixabayKey(key: string): void {
  try {
    localStorage.setItem(PIXABAY_KEY_STORAGE, key.trim());
  } catch {
    // Storage blocked: the key just won't persist.
  }
}

export function setPexelsKey(key: string): void {
  try {
    localStorage.setItem(PEXELS_KEY_STORAGE, key.trim());
  } catch {
    // Storage blocked: the key just won't persist.
  }
}

export function getFreesoundKey(): string {
  try {
    return localStorage.getItem(FREESOUND_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setFreesoundKey(key: string): void {
  try {
    localStorage.setItem(FREESOUND_KEY_STORAGE, key.trim());
  } catch {
    // Storage blocked: the key just won't persist.
  }
}
