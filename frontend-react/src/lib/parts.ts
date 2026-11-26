/** The installed app's optional downloads (see backend/parts.py). Nothing downloads without a button press. */
export type Part = {
  id: string; name: string; what: string; installed: boolean; download: number; space: number;
  download_text: string; space_text: string; partly: number; removing?: boolean;
};
export type PartState = { busy: boolean; part: string; step: string; done: number; total: number; speed: number; error: string; finished: string };
export type PartsStatus = { enabled: boolean; parts: Part[]; state: PartState; data_folder?: string; free?: number; note?: string };

export const size = (n: number) => (n >= 950e6 ? `${(n / 1e9).toFixed(1)} GB` : `${Math.round(n / 1e6)} MB`);

export async function partsCall(path = "", method = "GET"): Promise<PartsStatus> {
  const r = await fetch(`/api/parts${path}`, { method });
  const d = (await r.json().catch(() => ({}))) as PartsStatus & { detail?: string };
  if (!r.ok) throw new Error(d.detail || `Error ${r.status}`);
  return d;
}
