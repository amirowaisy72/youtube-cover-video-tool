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
