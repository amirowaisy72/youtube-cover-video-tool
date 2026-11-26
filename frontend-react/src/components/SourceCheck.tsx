/** Which sources could not be confirmed on their page. Their scenes show a quote card marked "reported". */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type Check = { url: string; ok: boolean; quoted?: boolean; reason: string; scenes?: number[] };

/** Ask the Sources panel of this video to open every page now (after the AI's answer was pasted). */
export function askSourceCheck(jobId: string, found: number | undefined) {
  if (found) window.dispatchEvent(new CustomEvent("ytguru-sources-check", { detail: jobId }));
}

export function CheckSummary({ checks }: { checks: Check[] }) {
  const quoted = checks.filter((c) => c.quoted !== false);
  const failed = quoted.filter((c) => !c.ok);
  if (!quoted.length) return null;
  if (!failed.length) return <p className="text-sm text-emerald-300">✓ All {quoted.length} quoted sentences were found on their pages.</p>;
  return (
    <div className="rounded-lg border border-amber-400/60 px-3 py-2 text-sm text-amber-300">
      <p className="font-semibold">⚠ {failed.length} of {quoted.length} sources could not be confirmed. Their scenes show a quote card marked “reported”:</p>
      <ul className="mt-1 list-disc pl-5">
        {failed.map((c) => (
          <li key={c.url + c.reason} className="break-all">
            {c.url} — {c.reason}{c.scenes?.length ? ` (scene ${c.scenes.join(", ")})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A Talking Presenter video's sources: checked by itself whenever the quoted sentences change. */
export function PresenterSources({ jobId, sources }: { jobId: string; sources: { url: string; quote?: string }[] }) {
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const quoted = sources.filter((s) => s.quote).map((s) => `${s.url}|${s.quote}`).join("\n");
  const check = async () => {
    setBusy(true);
    setErr("");
    try {
      setChecks((await api<{ results: Check[] }>(`/api/presenter/jobs/${jobId}/sources/check`, { method: "POST" })).results);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The pages could not be checked.");
    }
    setBusy(false);
  };
  useEffect(() => { setChecks([]); if (quoted) void check(); }, [jobId, quoted]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!quoted) return null;
  return (
    <div className="space-y-2">
      {busy && <p className="text-xs text-muted-foreground">📚 Opening every source page and looking for its sentence…</p>}
      {!busy && <CheckSummary checks={checks} />}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void check()}>🔍 Check against the real pages</button>
    </div>
  );
}
