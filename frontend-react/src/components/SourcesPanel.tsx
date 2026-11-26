/** Where the facts of a video come from: the AI's SOURCES list, saved with the video. Shown here, editable,
    checked against the real pages, used by the Script mode source() tool and added to the YouTube description. */
import { useEffect, useState } from "react";
import { CheckSummary, type Check } from "@/components/SourceCheck";
import { api, type VideoSource } from "@/lib/api";

type Data = { sources: VideoSource[]; text: string };

export function SourcesPanel({ jobId }: { jobId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [text, setText] = useState("");
  const [edit, setEdit] = useState(false);
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // a scene test may add pages (data charts, headlines) to the list
  const [stamp, setStamp] = useState(0);
  useEffect(() => {
    const on = () => setStamp((n) => n + 1);
    window.addEventListener("ytguru-sources-changed", on);
    return () => window.removeEventListener("ytguru-sources-changed", on);
  }, []);
  useEffect(() => {
    if (edit) return;
    api<Data>(`/api/sources/${jobId}`).then((d) => { setData(d); setText(d.text); }).catch(() => undefined);
  }, [stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setData(null);
    setChecks([]);
    setEdit(false);
    api<Data>(`/api/sources/${jobId}`).then((d) => { setData(d); setText(d.text); }).catch(() => undefined);
  }, [jobId]);

  const run = async (what: string, job: () => Promise<void>) => {
    setBusy(what);
    setErr("");
    try {
      await job();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy("");
    }
  };
  const save = () => run("Saving…", async () => {
    const d = await api<Data>(`/api/sources/${jobId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    });
    setData(d);
    setText(d.text);
    setChecks([]);
    setEdit(false);
  });
  const check = () => run("Opening every page and looking for its sentence…", async () => {
    setChecks((await api<{ results: Check[] }>(`/api/sources/${jobId}/check`, { method: "POST" })).results);
  });

  // the AI's answer was pasted: show the new list and open every page by itself
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== jobId) return;
      setEdit(false);
      void run("Opening every page and looking for its sentence…", async () => {
        const d = await api<Data>(`/api/sources/${jobId}`);
        setData(d);
        setText(d.text);
        setChecks([]);
        setChecks((await api<{ results: Check[] }>(`/api/sources/${jobId}/check`, { method: "POST" })).results);
      });
    };
    window.addEventListener("ytguru-sources-check", on);
    return () => window.removeEventListener("ytguru-sources-check", on);
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;
  const n = data.sources.length;
  return (
    <details className="rounded-xl border border-border px-4 py-3" open={n > 0}>
      <summary className="cursor-pointer font-semibold">
        📚 Sources <span className="font-normal text-muted-foreground">({n ? `${n} saved — added to the end of the YouTube description` : "none saved"})</span>
      </summary>
      <div className="mt-2 space-y-2">
        {!edit && <CheckSummary checks={checks} />}
        {!edit && data.sources.map((s, i) => {
          const c = checks[i];
          return (
            <div key={`${s.url}-${i}`} className="rounded-lg border border-border px-3 py-2 text-sm">
              {s.fact && <p className="font-medium">{s.fact}</p>}
              <a className="break-all text-primary underline" href={s.url} target="_blank" rel="noreferrer">{s.url}</a>
              {s.quote && <p className="mt-1 text-xs text-muted-foreground">“{s.quote}”</p>}
              {c && <p className={`mt-1 text-xs ${c.ok ? "text-emerald-300" : "text-amber-300"}`}>
                {c.ok ? "✓ The sentence is on this page." : `⚠ Not confirmed: ${c.reason}`}</p>}
            </div>
          );
        })}
        {edit && (
          <textarea className="field h-40 w-full font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'One source per line:\nthe fact | https://page-address | "the exact sentence copied from that page"'} />
        )}
        <div className="flex flex-wrap gap-2">
          {edit ? (
            <>
              <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void save()}>💾 Save sources</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEdit(false); setText(data.text); setErr(""); }}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>✏️ {n ? "Edit" : "Add sources"}</button>
              {n > 0 && <button className="btn btn-secondary btn-sm" disabled={!!busy} onClick={() => void check()}>🔍 Check against the real pages</button>}
            </>
          )}
        </div>
        {busy && <p className="text-xs text-muted-foreground">{busy}</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {n > 0 && !edit && <p className="text-xs text-muted-foreground">AI tools can invent links or sentences — check them before you publish.</p>}
      </div>
    </details>
  );
}
