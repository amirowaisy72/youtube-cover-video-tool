/** My Shapes (user, 2026-11-19): things the drawn library does not have yet (a camel, a doctor…)
    are drawn here — by the AI or by any AI you like (copy the prompt, paste its answer) — and from
    then on every Visual Explainer video uses your shape instead of an icon. */
import { useEffect, useState } from "react";
import { getKey } from "@/lib/config";

type Part = { shape: string; x?: number; y?: number; w?: number; h?: number; r?: number; start?: number; angle?: number;
  sw?: number; rot?: number; fill?: string; stroke?: string; points?: number[][] };
type Recipe = { parts: Part[] };

const NAMED: Record<string, string> = { cream: "#f1ece1", orange: "#e0782f", teal: "#2a9d8f", gold: "#f2c14e", yellow: "#f2c14e",
  blue: "#5b8def", red: "#e05a47", slate: "#3a4a5f", green: "#5cb85c", purple: "#9b7bd4", pink: "#e88aa8", brown: "#8c5a3c",
  grey: "#9aa5b5", gray: "#9aa5b5", white: "#ffffff", ink: "#1d2430", black: "#1d2430" };
const c = (v?: string, d = "#f1ece1") => (v ? (v.startsWith("#") ? v : NAMED[v.toLowerCase()] || d) : d);

/** The same recipe the video engine draws, as an SVG preview (0..1 box, y up). */
export function ShapePreview({ recipe, size = 96 }: { recipe: Recipe; size?: number }) {
  const Y = (y = 0.5) => 1 - y;
  return (
    <svg viewBox="-0.05 -0.05 1.1 1.1" width={size} height={size} className="rounded-lg bg-[#1b2433]">
      {recipe.parts.map((p, i) => {
        const tr = p.rot ? `rotate(${-p.rot} ${p.x ?? 0.5} ${Y(p.y)})` : undefined;
        if (p.shape === "rect") return <rect key={i} x={(p.x ?? 0.5) - (p.w ?? 0.2) / 2} y={Y(p.y) - (p.h ?? 0.2) / 2} width={p.w ?? 0.2} height={p.h ?? 0.2} rx={p.r ?? 0} fill={c(p.fill)} transform={tr} />;
        if (p.shape === "circle") return <circle key={i} cx={p.x ?? 0.5} cy={Y(p.y)} r={p.r ?? 0.1} fill={c(p.fill)} />;
        if (p.shape === "ellipse") return <ellipse key={i} cx={p.x ?? 0.5} cy={Y(p.y)} rx={(p.w ?? 0.2) / 2} ry={(p.h ?? 0.2) / 2} fill={c(p.fill)} transform={tr} />;
        if (p.shape === "polygon") return <polygon key={i} points={(p.points || []).map(([a, b]) => `${a},${Y(b)}`).join(" ")} fill={c(p.fill)} transform={tr} />;
        if (p.shape === "line" && (p.points || []).length >= 2) {
          const pts = p.points as number[][];
          const [a = 0, b = 0] = pts[0] ?? [];
          const [e = 0, f = 0] = pts[1] ?? [];
          return <line key={i} x1={a} y1={Y(b)} x2={e} y2={Y(f)} stroke={c(p.stroke || p.fill, "#1d2430")} strokeWidth={(p.sw || 4) / 200} strokeLinecap="round" />;
        }
        if (p.shape === "arc") {
          const r = p.r ?? 0.2, a0 = ((p.start ?? 0) * Math.PI) / 180, a1 = (((p.start ?? 0) + (p.angle ?? 180)) * Math.PI) / 180;
          const cx = p.x ?? 0.5, cy = Y(p.y);
          const d = `M ${cx + r * Math.cos(a0)} ${cy - r * Math.sin(a0)} A ${r} ${r} 0 ${(p.angle ?? 180) > 180 ? 1 : 0} 0 ${cx + r * Math.cos(a1)} ${cy - r * Math.sin(a1)}`;
          return <path key={i} d={d} fill="none" stroke={c(p.stroke || p.fill, "#1d2430")} strokeWidth={(p.sw || 4) / 200} />;
        }
        return null;
      })}
    </svg>
  );
}

export function MyShapes({ jobId }: { jobId?: string | null }) {
  const [shapes, setShapes] = useState<Record<string, Recipe>>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<{ name: string; recipe: Recipe } | null>(null);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = () => {
    void fetch("/api/visual/shapes").then((r) => r.json()).then((d: { shapes: Record<string, Recipe> }) => setShapes(d.shapes || {})).catch(() => undefined);
    if (jobId) void fetch(`/api/visual/missing/${jobId}`).then((r) => r.json()).then((d: { missing: string[] }) => setMissing(d.missing || [])).catch(() => undefined);
  };
  useEffect(load, [jobId]);
  const draw = async (n: string) => {
    setBusy(true); setMsg(""); setName(n);
    try {
      const r = await fetch("/api/visual/shapes/draw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, gemini_key: getKey("gemini") }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "The AI did not draw it.");
      setDraft(d);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); }
    setBusy(false);
  };
  const save = async () => {
    if (!draft) return;
    const r = await fetch("/api/visual/shapes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const d = await r.json();
    if (r.ok) { setShapes(d.shapes); setDraft(null); setMsg(`✓ Saved “${draft.name}” — new videos use it. For this video press 🔁 Redo on its scene.`); setMissing((m) => m.filter((x) => x !== draft.name)); }
    else setMsg(d.detail || "Could not save.");
  };
  const copyPrompt = async (n: string) => {
    const d = await fetch(`/api/visual/shapes/prompt?name=${encodeURIComponent(n)}`).then((r) => r.json());
    await navigator.clipboard.writeText(d.prompt);
    setName(n);
    setMsg("Prompt copied — paste it into ChatGPT / Gemini, then paste its JSON answer below.");
  };
  const usePaste = () => {
    try {
      const j = JSON.parse(paste.slice(paste.indexOf("{"), paste.lastIndexOf("}") + 1));
      if (!Array.isArray(j.parts)) throw new Error();
      setDraft({ name: (name || "my_shape").toLowerCase().replace(/[^a-z0-9]+/g, "_"), recipe: j });
      setPaste("");
    } catch { setMsg("That is not a shape JSON ({\"parts\": [...]})."); }
  };
  const remove = async (n: string) => {
    const d = await fetch(`/api/visual/shapes/${encodeURIComponent(n)}`, { method: "DELETE" }).then((r) => r.json());
    setShapes(d.shapes || {});
  };
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="font-semibold">✏️ My Shapes</div>
      <p className="mt-1 text-sm text-muted-foreground">The drawn library is used first. A thing it does not have uses a free icon — or draw your own shape here once, and every video uses it.</p>
      {missing.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-amber-300">This video uses icons for (draw them to match the style):</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {missing.map((m) => (
              <span key={m} className="chip gap-1">{m.replace(/_/g, " ")}
                <button className="underline" disabled={busy} onClick={() => void draw(m)}>Draw with AI</button>
                <button className="underline" onClick={() => void copyPrompt(m)}>Copy prompt</button>
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <input className="field w-48" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. camel, doctor, bull" />
        <button className="btn btn-secondary btn-sm" disabled={busy || name.trim().length < 2} onClick={() => void draw(name.trim())}>{busy ? "Drawing…" : "🤖 Draw with AI"}</button>
        <button className="btn btn-ghost btn-sm" disabled={name.trim().length < 2} onClick={() => void copyPrompt(name.trim())}>📋 Copy prompt</button>
      </div>
      <textarea className="field mt-2 min-h-[50px] font-mono text-xs" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='…or paste a shape JSON from another AI here: {"parts":[...]}' />
      {paste.trim() && <button className="btn btn-ghost btn-sm mt-1" onClick={usePaste}>Preview pasted shape</button>}
      {draft && (
        <div className="mt-3 flex items-center gap-3">
          <ShapePreview recipe={draft.recipe} size={120} />
          <div className="space-y-1">
            <p className="text-sm font-semibold">{draft.name.replace(/_/g, " ")}</p>
            <div className="flex gap-2">
              <button className="btn btn-primary btn-sm" onClick={() => void save()}>✓ Save shape</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void draw(draft.name)}>↻ Draw again</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setDraft(null)}>✕</button>
            </div>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-xs">{msg}</p>}
      {Object.keys(shapes).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {Object.entries(shapes).map(([n, r]) => (
            <div key={n} className="text-center text-xs">
              <ShapePreview recipe={r} size={64} />
              <p className="mt-0.5">{n.replace(/_/g, " ")}</p>
              <button className="text-rose-300 underline" onClick={() => void remove(n)}>delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
