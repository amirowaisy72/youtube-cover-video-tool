/** When a tool needs an optional download the server answers 428; this asks "Download now?" for every page,
    shows the progress with Cancel, and never starts anything by itself. */
import { useEffect, useState } from "react";
import { partsCall, size, type Part, type PartsStatus } from "@/lib/parts";

const EVENT = "ytguru-part-needed";
let watching = false;

function watchFetch() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  const plain = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await plain(...args);
    if (res.status === 428) {
      res.clone().json().then((d: { part?: Part }) => {
        if (d.part) window.dispatchEvent(new CustomEvent(EVENT, { detail: d.part }));
      }).catch(() => undefined);
    }
    return res;
  };
}
watchFetch();

export function PartProgress({ st }: { st: PartsStatus }) {
  const s = st.state;
  const percent = s.total ? Math.min(100, Math.round((s.done / s.total) * 100)) : 0;
  const installing = s.step === "Installing";
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-primary ${installing ? "animate-pulse" : ""}`} style={{ width: `${installing ? 100 : percent}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {installing ? "Installing… (a few minutes for the big parts)"
          : `Downloading ${size(s.done)} of ${size(s.total)} (${percent}%)${s.speed > 0 ? ` · ${(s.speed / 1e6).toFixed(1)} MB/s` : ""}`}
      </p>
    </div>
  );
}

export function PartPrompt() {
  const [part, setPart] = useState<Part | null>(null);
  const [st, setSt] = useState<PartsStatus | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const on = (e: Event) => {
      setErr("");
      setPart((e as CustomEvent<Part>).detail);
      partsCall().then(setSt).catch(() => undefined);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  const mine = !!st && !!part && st.state.part === part.id;
  const busy = mine && st.state.busy;
  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => { partsCall().then(setSt).catch(() => undefined); }, 1000);
    return () => window.clearInterval(t);
  }, [busy]);

  if (!part) return null;
  const now = st?.parts.find((p) => p.id === part.id) ?? part;
  const act = (path: string) => { setErr(""); partsCall(path, "POST").then(setSt).catch((e: Error) => setErr(e.message)); };
  const done = now.installed;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Download needed">
      <div className="glass w-full max-w-md space-y-4 p-6">
        <h2 className="text-xl font-bold">{done ? `✓ ${now.name} is ready` : `This tool needs ${now.name} (${now.download_text}). Download now?`}</h2>
        {done ? (
          <p className="text-sm text-muted-foreground">Press your button again to carry on.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{now.what}</p>
            <ul className="text-sm">
              <li>Download: <b>{now.download_text}</b>{now.partly > 0 && !busy ? ` (${size(now.partly)} already here)` : ""}</li>
              <li>Space it will use: <b>about {now.space_text}</b>{st?.free ? ` — ${size(st.free)} free` : ""}</li>
              {st?.data_folder && <li className="break-all text-muted-foreground">Saved in {st.data_folder}</li>}
            </ul>
          </>
        )}
        {busy && st && <PartProgress st={st} />}
        {!busy && !done && mine && st.state.error && <p className="text-sm text-amber-300">{st.state.error}</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          {busy ? (
            <>
              <button className="btn btn-ghost" onClick={() => setPart(null)}>Hide (keeps downloading)</button>
              <button className="btn btn-secondary" onClick={() => act("/cancel")}>Cancel download</button>
            </>
          ) : done ? (
            <button className="btn btn-primary" onClick={() => setPart(null)}>OK</button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => setPart(null)}>Not now</button>
              <button className="btn btn-primary" onClick={() => act(`/${now.id}/get`)}>⬇ Download</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
