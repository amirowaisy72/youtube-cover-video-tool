import { useEffect, useState, useSyncExternalStore } from "react";
import step1 from "@/assets/colab/step1-open.jpg";
import step2 from "@/assets/colab/step2-signin.jpg";
import step3 from "@/assets/colab/step3-menu.jpg";
import step4 from "@/assets/colab/step4-gpu.jpg";
import step5 from "@/assets/colab/step5-runall.jpg";
import step6 from "@/assets/colab/step6-copy.jpg";

/** One "⚡ Connect Google Colab" panel for every tool that needs Google's GPU: a status light,
 *  a picture guide, the paste box (tested at once), and the pause screen when Colab stops mid-job. */

export type Colab = {
  state: "connected" | "not_connected" | "disconnected";
  url: string; gpu: boolean; gpu_name: string; old_notebook: boolean; error: string;
  paused: { since: number; reason: string; minutes: number } | null;
  pause_wanted: boolean; notebook_url: string;
};

// one status for the whole page, asked from this computer every few seconds
let current: Colab | null = null;
let timer = 0;
const listeners = new Set<() => void>();
const publish = (next: Colab | null) => { current = next; listeners.forEach((f) => f()); };

async function refresh(fresh = false) {
  try {
    const r = await fetch(`/api/colab/status${fresh ? "?fresh=true" : ""}`);
    publish(r.ok ? ((await r.json()) as Colab) : null);
  } catch {
    publish(null); // no backend (the website without the installed app)
  }
}

function subscribe(f: () => void) {
  listeners.add(f);
  if (!timer) { void refresh(); timer = window.setInterval(() => void refresh(), 5000); }
  return () => {
    listeners.delete(f);
    if (!listeners.size && timer) { window.clearInterval(timer); timer = 0; }
  };
}

export function useColab() {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

async function send(path: string, method: string, body?: unknown): Promise<Colab> {
  const r = await fetch(`/api/colab/${path}`, {
    method, headers: { "Content-Type": "application/json" }, body: body === undefined ? null : JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as Colab & { detail?: string };
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : "That did not work. Try again.");
  publish(data);
  return data;
}

export const openColab = () => window.dispatchEvent(new Event("ytguru-colab"));

function light(st: Colab) {
  if (st.state === "connected") return st.gpu ? { dot: "bg-emerald-400", text: "Connected" } : { dot: "bg-amber-400", text: "Connected, no GPU" };
  if (st.state === "disconnected") return { dot: "bg-red-500", text: "Disconnected" };
  return { dot: "bg-slate-500", text: "Not connected" };
}

export function ColabLight({ st }: { st: Colab }) {
  const l = light(st);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />{l.text}
    </span>
  );
}

/** The button at the top of every page. */
export function ColabButton() {
  const st = useColab();
  if (!st) return null;
  return (
    <button className="btn btn-sm btn-ghost" onClick={openColab} title={`Google Colab: ${light(st).text} — click for the guide`}>
      <span className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-full ${light(st).dot}`} />⚡ Colab
    </button>
  );
}

function PasteBox({ label = "Connect", onDone }: { label?: string; onDone?: () => void }) {
  const [line, setLine] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const connect = async () => {
    if (!line.trim() || busy) return;
    setBusy(true); setMsg(null);
    try {
      const st = await send("connect", "POST", { line: line.trim() });
      if (st.state === "connected" && st.gpu) {
        setLine("");
        setMsg({ ok: true, text: `✓ Connected${st.gpu_name ? ` (${st.gpu_name})` : ""}` });
        onDone?.();
      } else setMsg({ ok: false, text: st.error || "Colab did not answer. Press Run all again." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "That did not work. Try again." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input className="field min-w-0 flex-1" value={line} placeholder="Paste the whole line from Colab here"
          onChange={(e) => { setLine(e.target.value); setMsg(null); }} onKeyDown={(e) => { if (e.key === "Enter") void connect(); }} />
        <button className="btn btn-primary btn-sm" disabled={busy || !line.trim()} onClick={() => void connect()}>
          {busy ? "Testing…" : label}
        </button>
      </div>
      {msg && <p className={`mt-2 text-sm font-semibold ${msg.ok ? "text-emerald-300" : "text-amber-300"}`}>{msg.text}</p>}
    </div>
  );
}

function Step({ n, title, img, children }: { n: number; title: string; img?: string; children?: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-border p-3">
      <p className="font-semibold"><span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-primary/25 text-sm">{n}</span>{title}</p>
      {children && <div className="mt-1.5 text-sm text-muted-foreground">{children}</div>}
      {img && <img src={img} alt={title} loading="lazy" className="mt-2 w-full max-w-xl rounded-lg border border-border bg-white" />}
    </li>
  );
}

function Guide({ st }: { st: Colab }) {
  return (
    <ol className="space-y-3">
      <Step n={1} title="Open the notebook" img={step1}>
        <a className="btn btn-primary btn-sm mr-2" href={st.notebook_url} target="_blank" rel="noreferrer">Open the notebook ↗</a>
        Then press <b>Copy to Drive</b> to keep your own copy (next time, open that copy).
        <p className="mt-1.5">Button not working? <a className="underline" href="/api/colab/notebook" download>Download the notebook</a>, then in Colab use <b>File → Upload notebook</b>.</p>
      </Step>
      <Step n={2} title="Sign in with your Google account" img={step2}>Press <b>Sign in</b> at the top right. Skip this if you are already signed in.</Step>
      <Step n={3} title="Open Runtime, then Change runtime type" img={step3} />
      <Step n={4} title="Choose T4 GPU, then Save" img={step4}>If T4 GPU cannot be chosen, Google has no free GPU for you right now. Try again later.</Step>
      <Step n={5} title="Press Run all" img={step5}>If Google warns that the notebook was not made by Google, press <b>Run anyway</b>.</Step>
      <Step n={6} title="Wait 5–10 minutes, then copy the line" img={step6}>The line appears near the bottom. It starts with https://</Step>
      <Step n={7} title="Paste it here"><PasteBox /><p className="mt-2">Keep the Colab tab open while the app is working.</p></Step>
    </ol>
  );
}

function Panel({ st, onClose }: { st: Colab; onClose: () => void }) {
  useEffect(() => {
    void refresh(true);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 overflow-y-auto bg-black/70 p-3 sm:p-8" style={{ zIndex: 100000 }} onClick={onClose} role="dialog" aria-modal="true" aria-label="Connect Google Colab">
      <div className="glass mx-auto max-w-2xl p-5 shadow-2xl" style={{ background: "var(--background)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">⚡ Connect Google Colab</h2>
            <p className="mt-1 text-sm font-semibold"><ColabLight st={st} />{st.state === "connected" && st.gpu_name ? ` · ${st.gpu_name}` : ""}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {st.error && <p className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-sm">{st.error}</p>}
        {st.old_notebook && <p className="mt-2 text-xs text-muted-foreground">This is the older voice notebook. It still works; the new one below is the notebook that will get new tools.</p>}
        <p className="mt-2 text-sm text-muted-foreground">
          Colab is Google's computer with a fast graphics chip. The app uses it to make your cloned and acting voices faster.
          One notebook, started once per session.
        </p>
        <p className="mt-2 rounded-lg border border-border p-2 text-xs text-muted-foreground">
          Google's rules for Colab limit how a free session may be used, including connections from other programs like this one.
          Google can end a session without warning.{" "}
          <a className="underline" href="https://research.google.com/colaboratory/faq.html" target="_blank" rel="noreferrer">Read Google's rules ↗</a>
        </p>
        <div className="mt-4"><PasteBox label={st.url ? "Connect new line" : "Connect"} /></div>
        {st.url && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="break-all">Saved link: {st.url}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => void refresh(true)}>Test again</button>
            <button className="btn btn-ghost btn-sm" onClick={() => void send("connect", "DELETE")}>Forget it</button>
          </div>
        )}
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={st.pause_wanted} onChange={(e) => void send("settings", "POST", { pause: e.target.checked })} />
          <span>If Colab stops in the middle of a job, <b>pause and wait for me</b>. (Off: this computer carries on, much slower.)</span>
        </label>
        <h3 className="mb-2 mt-5 font-semibold">How to start Colab, step by step</h3>
        <Guide st={st} />
      </div>
    </div>
  );
}

/** Mounted once for the whole app: the panel and the pause screen. */
export function ColabHost() {
  const st = useColab();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("ytguru-colab", on);
    return () => window.removeEventListener("ytguru-colab", on);
  }, []);
  if (!st) return null;
  return (
    <>
      {st.paused && (
        <div className="border-b border-red-500/50 bg-red-500/10" role="alert">
          <div className="mx-auto max-w-6xl px-6 py-3 text-sm">
            <p className="font-semibold">⏸ Paused: Google Colab stopped{st.paused.minutes ? ` (waiting ${st.paused.minutes} min)` : ""}. The work already done is kept.</p>
            <p className="mt-1 text-amber-300">{st.paused.reason}</p>
            <p className="mt-1">1. Open your Colab tab. 2. Press <b>Runtime → Run all</b>. 3. Copy the new line and paste it here. The job then carries on.</p>
            <div className="mt-2"><PasteBox label="Connect and continue" /></div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => void send("continue-here", "POST")}>Continue on this computer instead (slower)</button>
              <button className="btn btn-ghost btn-sm" onClick={openColab}>Show the picture guide</button>
            </div>
          </div>
        </div>
      )}
      {open && <Panel st={st} onClose={() => setOpen(false)} />}
    </>
  );
}

const mins = (secs: number) => (secs < 90 ? "about a minute" : secs < 5400 ? `about ${Math.round(secs / 60)} minutes` : `about ${(secs / 3600).toFixed(1)} hours`);

/** Shown where a cloned voice is about to be made: how long it takes and what to do first. */
export function ColabEstimate({ chars }: { chars?: number | undefined }) {
  const st = useColab();
  const [est, setEst] = useState<{ colab_secs: number; cpu_secs: number; measured: boolean } | null>(null);
  useEffect(() => {
    if (!chars) { setEst(null); return; }
    fetch(`/api/colab/estimate?chars=${chars}`).then((r) => (r.ok ? r.json() : null)).then(setEst).catch(() => setEst(null));
  }, [chars]);
  if (!st) return null;
  const ready = st.state === "connected" && st.gpu;
  return (
    <div className={`mt-2 rounded-lg border p-2 text-xs ${ready ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/50 bg-amber-500/10"}`}>
      <p>
        <ColabLight st={st} />
        {ready ? " — your cloned voice is made on Google's GPU. Keep the Colab tab open until it is done."
          : " — a cloned voice is slow on this computer (every line is made several times)."}
      </p>
      {est && (
        <p className="mt-1">
          ⏱ This script: <b>{mins(ready ? est.colab_secs : est.cpu_secs)}</b>
          {ready ? ` on Colab (this computer: ${mins(est.cpu_secs)})` : ` here (Colab: ${mins(est.colab_secs)})`}.
          {" "}A rough estimate{est.measured ? " from your earlier voices" : ""}; voices already made are not made again.
        </p>
      )}
      {!ready && <button className="btn btn-ghost btn-sm mt-1.5" onClick={openColab}>⚡ Connect Google Colab</button>}
    </div>
  );
}
