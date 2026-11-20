import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { installDashboardButton } from "@/lib/config";
import { buildPrompt, type Check, type PackInfo, parsePack, placeRow, type Row, type Status, thingRow } from "@/lib/planner";
import { BLUEPRINTS } from "@/lib/world/blueprints";
import { loadKitIndex } from "@/lib/world/kits";
import { type Recipe, recipeToWorld } from "@/lib/world/recipe";
import type { ModelDef } from "@/lib/world/types";

installDashboardButton();

export const Route = createFileRoute("/planner")({
  component: Planner,
});

const PLANNER_SCRIPT_KEY = "ytguru-planner-script";
const ANIMATOR_SCRIPT_KEY = "ytguru-animator-script";

function load(k: string) { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } }
function store(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }

const ICON: Record<Status, string> = { ok: "✓", near: "⚠", missing: "✗" };
const COLOR: Record<Status, string> = { ok: "text-emerald-300", near: "text-amber-300", missing: "text-rose-300" };

function Section({ title, rows, open }: { title: string; rows: Row[]; open?: boolean }) {
  const bad = rows.filter((r) => r.status !== "ok").length;
  const [show, setShow] = useState(!!open || bad > 0);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-border">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left" onClick={() => setShow((v) => !v)}>
        <span className="font-semibold">{title}</span>
        <span className="text-sm">
          {bad ? <span className="text-amber-300">{bad} need work</span> : <span className="text-emerald-300">all ready</span>}
          <span className="ml-2 text-muted-foreground">{rows.length} · {show ? "▲" : "▼"}</span>
        </span>
      </button>
      {show && (
        <div className="divide-y divide-border border-t border-border">
          {[...rows].sort((a, b) => ["missing", "near", "ok"].indexOf(a.status) - ["missing", "near", "ok"].indexOf(b.status)).map((r) => (
            <div key={r.key} className="px-4 py-2 text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={`font-bold ${COLOR[r.status]}`}>{ICON[r.status]}</span>
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground">— {r.how}</span>
              </div>
              {r.example && r.status !== "ok" && <div className="mt-0.5 truncate pl-5 text-xs text-muted-foreground">{r.example}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Planner() {
  const [script, setScriptState] = useState(() => load(PLANNER_SCRIPT_KEY) || load(ANIMATOR_SCRIPT_KEY));
  const setScript = (v: string) => { setScriptState(v); store(PLANNER_SCRIPT_KEY, v); };
  const [res, setRes] = useState<Check | null>(null);
  const [lib, setLib] = useState<Record<string, ModelDef>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [answer, setAnswer] = useState("");
  const [installMsg, setInstallMsg] = useState<{ ok: string[]; errors: string[] } | null>(null);
  const [installing, setInstalling] = useState(false);
  const [info, setInfo] = useState<{ builtin: string[]; custom: string[]; sounds: string[] }>({ builtin: [], custom: [], sounds: [] });
  const [packInfo, setPackInfo] = useState<PackInfo | null>(null);

  const refreshPack = () => fetch("/api/animator/planner/pack").then((r) => r.json()).then((d) => setPackInfo(d as PackInfo)).catch(() => undefined);
  useEffect(() => {
    void refreshPack();
    fetch("/api/animator/actions").then((r) => r.json()).then((d: { builtin: string[]; actions: Record<string, unknown>; sounds: string[] }) =>
      setInfo({ builtin: d.builtin ?? [], custom: Object.keys(d.actions ?? {}), sounds: d.sounds ?? [] })).catch(() => undefined);
  }, []);

  const check = async () => {
    if (!script.trim()) return;
    setBusy(true); setErr(""); setInstallMsg(null);
    try {
      await loadKitIndex();
      let things: Record<string, ModelDef> = {};
      try { things = (await (await fetch("/api/worlds/_things")).json()).models ?? {}; } catch { /* none */ }
      setLib(things);
      const r = await fetch("/api/animator/planner/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ script }) });
      const d = await r.json();
      if (!r.ok) throw new Error((d as { detail?: string }).detail || "Could not read the script.");
      setRes(d as Check);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not check the script.");
    } finally {
      setBusy(false);
    }
  };

  const rows = useMemo(() => {
    if (!res) return null;
    const seen = new Set<string>();
    const places = res.scenes.map(placeRow).filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true)));
    const tags: Row[] = res.tags.map((t) => ({ key: t.tag, label: `${t.tag}${t.count > 1 ? ` ×${t.count}` : ""}`, status: t.status,
      how: t.status === "ok" ? "acted" : t.status === "near" ? `shown as ${t.shown_as || "something close"}` : "the app cannot act this yet", example: t.example.text }));
    const things = res.things.map((t) => thingRow(t, lib));
    const outfits: Row[] = res.outfits.map((o) => ({ key: o.name, label: `{wear:${o.name}}`, status: o.status,
      how: o.status === "ok" ? "outfit ready" : `no such outfit — shown as ${o.shown_as}`, example: o.example.text }));
    const sounds: Row[] = res.sounds.map((s) => ({ key: s.word, label: `[${s.word}]`, status: "missing", how: "unknown sound / word — it would be ignored", example: s.example }));
    const cast: Row[] = res.speakers.map((s) => ({ key: s.name, label: `${s.name} (${s.lines} lines)`, status: "ok", how: s.saved ? "your character (Character Studio)" : s.animal ? "a talking animal" : s.look ? "look from your add-on pack" : "made automatically (random look — the AI can give a fitting look)" }));
    return { places, tags, things, outfits, sounds, cast };
  }, [res, lib]);

  const counts = useMemo(() => {
    if (!rows) return null;
    const all = [...rows.places, ...rows.tags, ...rows.things, ...rows.outfits, ...rows.sounds];
    return { missing: all.filter((r) => r.status === "missing").length, near: all.filter((r) => r.status === "near").length, ok: all.filter((r) => r.status === "ok").length };
  }, [rows]);

  const copyPrompt = async () => {
    if (!res || !rows) return;
    const text = buildPrompt(res, rows, script, { ...info, library: Object.keys(lib) });
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setAnswer(await f.text());
  };

  const install = async () => {
    const p = parsePack(answer);
    if (!p) { setInstallMsg({ ok: [], errors: ["No add-on pack found in that text. Paste the AI's whole answer (or upload the .json file)."] }); return; }
    setInstalling(true); setInstallMsg(null);
    const ok: string[] = [], errors: string[] = [];
    try {
      const things = (p.things ?? p.models ?? {}) as Record<string, ModelDef>;
      const library = { ...lib, ...Object.fromEntries(Object.entries(things).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, "_"), v])) };
      const placesSaved: string[] = [];
      for (const [name, rc] of Object.entries((p.places ?? {}) as Record<string, Recipe>)) {
        try {
          const doc = recipeToWorld({ ...rc, name }, Math.floor(Math.random() * 1e6), 9, library);
          const r = await fetch(`/api/worlds/${encodeURIComponent(name)}`, { method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...doc, name, exact_place: true }) });
          if (!r.ok) throw new Error(((await r.json()) as { detail?: string }).detail || `error ${r.status}`);
          placesSaved.push(name);
        } catch (e) {
          errors.push(`place "${name}": ${e instanceof Error ? e.message : "could not be built"}`);
        }
      }
      const rest = { ...p };
      delete rest.places;
      const r = await fetch("/api/animator/planner/install", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: rest, places_saved: placesSaved }) });
      const d = (await r.json()) as { added?: Record<string, string[]>; errors?: string[]; detail?: string };
      if (!r.ok) throw new Error(d.detail || "Could not install the pack.");
      for (const [k, v] of Object.entries(d.added ?? {})) if (v.length) ok.push(`${k}: ${v.join(", ")}`);
      errors.push(...(d.errors ?? []));
      setInstallMsg({ ok, errors });
      setAnswer("");
      void refreshPack();
      await check();
    } catch (e) {
      setInstallMsg({ ok, errors: [...errors, e instanceof Error ? e.message : "Could not install the pack."] });
    } finally {
      setInstalling(false);
    }
  };

  const useInAnimator = () => { store(ANIMATOR_SCRIPT_KEY, script); store("ytguru-animator-own", "1"); };

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24">
      <PageHeader icon="🧭" title="Script Planner" sub="Paste your planned script — see exactly what the app can and cannot show yet, and fill the gaps with one AI prompt." />

      <div className="glass space-y-3 p-5">
        <div className="flex items-center justify-between">
          <span className="font-semibold">1. Your script</span>
          <span className="text-xs text-muted-foreground">{script.split("\n").filter((l) => l.includes(":")).length} lines</span>
        </div>
        <textarea className="field min-h-56 font-mono text-sm" value={script} onChange={(e) => setScript(e.target.value)}
          placeholder={"# Scene: city street (night)\nTeddy: {drive:police car} Hold on! [excited, horn]\nPeddy: {surf:wave} Wheee! [happy]"} />
        <button className="btn btn-primary w-full py-3" disabled={busy || !script.trim()} onClick={() => void check()}>
          {busy ? "Checking every line…" : "🔍 Check my script"}
        </button>
        {err && <p className="text-sm text-rose-300">{err}</p>}
      </div>

      {rows && counts && res && (
        <div className="mt-6 space-y-4">
          <div className="glass flex flex-wrap items-center gap-3 p-4">
            <span className="font-semibold">2. What the app can show</span>
            <span className="rounded-full border border-rose-500/50 bg-rose-500/10 px-3 py-0.5 text-sm text-rose-300">✗ {counts.missing} missing</span>
            <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-0.5 text-sm text-amber-300">⚠ {counts.near} approximate</span>
            <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-0.5 text-sm text-emerald-300">✓ {counts.ok} ready</span>
            <span className="text-sm text-muted-foreground">{res.scenes.length} scenes · {res.lines} lines · {res.screens} screens · {(res as Check & { graphics?: number }).graphics ?? 0} motion graphics</span>
          </div>
          <Section title="🏞 Places" rows={rows.places} />
          <Section title="🎬 Actions (tags in { })" rows={rows.tags} />
          <Section title="📦 Things & vehicles" rows={rows.things} />
          <Section title="👕 Outfits" rows={rows.outfits} />
          <Section title="🔊 Sounds & words in [ ]" rows={rows.sounds} />
          <Section title="🧑 Characters" rows={rows.cast} />

          {counts.missing + counts.near > 0 ? (
            <div className="glass space-y-3 p-5">
              <div className="font-semibold">3. Get the missing pieces</div>
              <p className="text-sm text-muted-foreground">
                Copy this prompt into ChatGPT or Gemini. It lists exactly what is missing (with your lines) and the file format the app reads.
                The AI answers with an add-on pack — paste the answer (or upload the .json file) below.
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => void copyPrompt()}>{copied ? "✓ Copied" : "📋 Copy prompt for ChatGPT / Gemini"}</button>
                <a className="btn btn-ghost" href="https://chatgpt.com/" target="_blank" rel="noreferrer">Open ChatGPT ↗</a>
                <a className="btn btn-ghost" href="https://gemini.google.com/" target="_blank" rel="noreferrer">Open Gemini ↗</a>
              </div>
              <div className="font-semibold">4. Add the AI's file to the app</div>
              <textarea className="field h-32 font-mono text-xs" value={answer} onChange={(e) => setAnswer(e.target.value)}
                placeholder="Paste the AI's whole answer here…" />
              <div className="flex flex-wrap items-center gap-2">
                <label className="btn btn-ghost cursor-pointer">
                  ⬆ Upload .json file
                  <input type="file" accept=".json,.txt,application/json,text/plain" className="hidden" onChange={(e) => void readFile(e.target.files?.[0])} />
                </label>
                <button className="btn btn-primary" disabled={installing || !answer.trim()} onClick={() => void install()}>
                  {installing ? "Adding…" : "✅ Add to my app and check again"}
                </button>
              </div>
            </div>
          ) : (
            <div className="glass p-5 text-emerald-300">
              🎉 Everything in this script can be shown. <Link to="/animator" className="btn btn-primary btn-sm ml-2" onClick={useInAnimator}>Make it in the Story Animator →</Link>
            </div>
          )}
          {counts.missing + counts.near > 0 && (
            <p className="text-xs text-muted-foreground">
              You can also make the video now — missing things are skipped or shown approximately.{" "}
              <Link to="/animator" className="underline" onClick={useInAnimator}>Open in the Story Animator</Link>
            </p>
          )}
          {installMsg && (
            <div className="glass space-y-1 p-4 text-sm">
              {installMsg.ok.map((m) => <p key={m} className="text-emerald-300">✓ {m}</p>)}
              {installMsg.errors.map((m) => <p key={m} className="text-amber-300">⚠ {m}</p>)}
              {!installMsg.ok.length && !installMsg.errors.length && <p className="text-muted-foreground">The file had nothing new in it.</p>}
            </div>
          )}
        </div>
      )}

      {packInfo && packInfo.packs.length > 0 && (
        <div className="glass mt-8 p-5">
          <div className="mb-2 font-semibold">Installed add-on packs</div>
          {packInfo.packs.slice().reverse().map((p) => (
            <p key={p.name + p.installed} className="text-sm">
              <b>{p.name}</b> <span className="text-muted-foreground">· {p.installed.replace("T", " ")} · {Object.entries(p.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ")}</span>
            </p>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">
            Actions can be changed in the Action Builder, places and things in the 3D World Designer (Story Animator page).
            {" "}Ready-made places: {BLUEPRINTS.length}.
          </p>
        </div>
      )}
    </div>
  );
}
