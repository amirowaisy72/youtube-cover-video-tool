/**
 * Action Builder (user, 2026-11-18: "if the app cannot show something, it
 * must ask me, and I make it right there"). An action is put together from
 * simple pieces — no code: walk to the thing, a body pose, what the hands
 * do, something to hold, ride it, an effect, what happens to the thing,
 * a sound. Saved once, it works in every video: {weld:track}.
 */
import { useEffect, useState } from "react";
import { ActionPreview } from "@/components/ActionPreview";
import { getGeminiKey } from "@/lib/gemini";

export type ActionDef = {
  label: string; words: string[]; frames: number; go: boolean; body: string; arms: string; hold: string;
  ride: boolean; rideDist: number; effect: string; change: string; color: string; atStart: boolean;
  sound: string; closeup: boolean; thing: string;
};

const BODIES = [["stand", "Standing"], ["kneel", "Kneeling (on the ground, working)"], ["crouch", "Crouching"], ["sit", "Sitting"]] as const;
const ARMS = [["work", "Working with both hands on it"], ["hammer", "Hitting / hammering"], ["reach", "Reaching / touching it"],
  ["point", "Pointing at it"], ["up", "Both arms up (scared / cheering)"], ["wave", "Waving"], ["drive", "Holding handlebars / a wheel"], ["none", "Nothing special"]] as const;
const EFFECTS = [["", "No effect"], ["sparks", "⚡ Sparks (welding, metal)"], ["smoke", "💨 Smoke"], ["fire", "🔥 Fire + smoke"], ["dust", "🟫 Dust"],
  ["sparkle", "✨ Sparkles"], ["splash", "💦 Water splash"]] as const;
const CHANGES = [["", "Nothing — it stays as it is"], ["break", "It breaks (and stays broken)"], ["fix", "It gets fixed (back to normal)"],
  ["fall", "It falls over / crashes"], ["hide", "It disappears / is destroyed"], ["show", "It appears / is built"],
  ["glow", "It glows"], ["color", "It changes colour"]] as const;
const HOLDS = ["", "hammer", "welding torch", "shovel", "brush", "frying pan", "wrench", "stick", "sword"];

export function blankAction(name: string, thing = ""): ActionDef {
  return { label: name, words: [name], frames: 72, go: true, body: "stand", arms: "work", hold: "", ride: false, rideDist: 8,
    effect: "", change: "", color: "#f472b6", atStart: false, sound: "", closeup: true, thing };
}

export function ActionBuilder({ name: name0, thing, describe: describe0 = "", auto = false, onClose, onSaved }:
  { name: string; thing?: string; describe?: string; auto?: boolean; onClose: () => void; onSaved: (name: string) => void }) {
  const [describe, setDescribe] = useState(describe0);
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const [note, setNote] = useState("");
  const [name, setName] = useState(name0.replace(/[^a-z-]/gi, "").toLowerCase());
  const [a, setA] = useState<ActionDef>(() => blankAction(name0, thing ?? ""));
  const [sounds, setSounds] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/animator/actions").then((r) => r.json()).then((j) => {
      setSounds(j.sounds ?? []);
      const have = j.actions?.[name0];
      if (have) setA({ ...blankAction(name0, thing ?? ""), ...have });
    }).catch(() => { /* fine */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const set = <K extends keyof ActionDef>(k: K, v: ActionDef[K]) => setA((x) => ({ ...x, [k]: v }));
  /** The AI's settings → the form (only known values are taken). */
  const fill = (j: Record<string, unknown>) => {
    const pick = <T,>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
    setA((x) => ({
      ...x,
      label: String(j.label ?? x.label).slice(0, 80),
      words: Array.isArray(j.words) ? (j.words as unknown[]).map(String).slice(0, 10) : x.words,
      go: j.go === undefined ? x.go : !!j.go, atStart: !!j.atStart,
      body: pick(j.body, BODIES.map((b) => b[0]), x.body), arms: pick(j.arms, ARMS.map((b) => b[0]), x.arms),
      hold: typeof j.hold === "string" ? j.hold.slice(0, 40) : x.hold,
      ride: !!j.ride, rideDist: Math.max(2, Math.min(60, Number(j.rideDist) || x.rideDist)),
      effect: pick(j.effect, EFFECTS.map((b) => b[0]), ""), change: pick(j.change, CHANGES.map((b) => b[0]), ""),
      color: typeof j.color === "string" && /^#[0-9a-f]{6}$/i.test(j.color) ? j.color : x.color,
      sound: typeof j.sound === "string" ? j.sound : x.sound,
      frames: Math.max(24, Math.min(192, Math.round(Number(j.frames) || x.frames))),
      closeup: j.closeup === undefined ? x.closeup : !!j.closeup,
      thing: typeof j.thing === "string" && j.thing ? j.thing.slice(0, 40) : x.thing,
    }));
    if (typeof j.name === "string" && !name) setName(j.name.toLowerCase().replace(/[^a-z-]/g, ""));
  };
  const fromWords = async () => {
    if (describe.trim().length < 3) { setErr("Write what should happen, e.g. weld the track, kneeling, with sparks."); return; }
    setThinking(true); setErr(""); setNote("The free AI is making it…");
    try {
      const r = await fetch("/api/animator/actions/ai", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: describe, name, thing: a.thing, gemini_key: getGeminiKey() }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail ?? "The AI did not answer.");
      fill(j.action ?? {});
      setNote("✓ Done — watch the preview. Not right? Change the words (or the boxes below) and try again.");
    } catch (e) { setErr(String((e as Error).message)); setNote(""); } finally { setThinking(false); }
  };
  const copyPrompt = async () => {
    const r = await fetch("/api/animator/actions/prompt", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: describe || name, name, thing: a.thing }) });
    const text = String((await r.json()).prompt ?? "");
    try { await navigator.clipboard.writeText(text); } catch { window.prompt("Copy this prompt:", text); }
    setNote("✓ Copied — paste it in ChatGPT, then paste its answer in the box below.");
  };
  const fromAnswer = () => {
    const m = answer.match(/\{[\s\S]*\}/);
    try { if (m) { fill(JSON.parse(m[0])); setNote("✓ Filled from ChatGPT's answer — watch the preview."); return; } } catch { /* below */ }
    setErr("That answer has no settings in it — paste ChatGPT's whole reply.");
  };
  useEffect(() => { if (auto && describe0) void fromWords(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const save = async () => {
    if (!/^[a-z][a-z-]{1,29}$/.test(name)) { setErr("One English word for the action, e.g. weld, ride, repair."); return; }
    setBusy(true); setErr("");
    try {
      const words = [...new Set([name, ...a.words.map((w) => w.trim().toLowerCase()).filter(Boolean)])];
      const r = await fetch(`/api/animator/actions/${name}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...a, words }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail ?? "Could not save.");
      onSaved(name);
    } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); }
  };
  const row = "grid grid-cols-[150px_1fr] items-center gap-2 text-sm";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass max-h-[90vh] w-full max-w-xl space-y-3 overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold">🛠 Make an action</div>
        <p className="text-xs text-muted-foreground">Say it in your own words (or set the boxes). Once saved it works in every video: <b>{`{${name || "name"}:thing}`}</b>.</p>
        <div className="space-y-2 rounded-lg bg-primary/5 p-2">
          <textarea className="field h-16 w-full text-sm" value={describe} onChange={(e) => setDescribe(e.target.value)}
            placeholder="In your own words: weld the broken track, kneeling, with lots of sparks, then it is fixed" />
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" disabled={thinking} onClick={() => void fromWords()}>{thinking ? "⏳ Making…" : "✨ Make it from my words (free AI)"}</button>
            <button className="btn btn-secondary btn-sm" onClick={() => void copyPrompt()}>📋 Prompt for ChatGPT</button>
          </div>
          <textarea className="field h-12 w-full font-mono text-xs" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="…or paste ChatGPT's answer here" />
          {answer.trim() && <button className="btn btn-secondary btn-sm" onClick={fromAnswer}>🏗 Use ChatGPT's answer</button>}
          {note && <p className="text-xs">{note}</p>}
        </div>
        <div className="text-xs font-medium">👀 Preview (this is how it will look in the video):</div>
        <ActionPreview name={name || "preview"} thing={a.thing} def={{ ...a, words: a.words }} />
        <div className={row}><span>Name (one word)</span><input className="field" value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z-]/g, ""))} /></div>
        <div className={row}><span>Other words for it</span><input className="field" value={a.words.join(", ")} placeholder="welding, welded, join" onChange={(e) => set("words", e.target.value.split(","))} /></div>
        <div className={row}><span>Usually done to</span><input className="field" value={a.thing} placeholder="track, car, door… (when the line does not say)" onChange={(e) => set("thing", e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.go} onChange={(e) => set("go", e.target.checked)} /> First walk up to the thing</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.atStart} onChange={(e) => set("atStart", e.target.checked)} /> It is already like this when the scene starts (nobody does it — e.g. "the track is broken")</label>
        <div className={row}><span>Body</span><select className="field" value={a.body} onChange={(e) => set("body", e.target.value)}>{BODIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className={row}><span>Hands</span><select className="field" value={a.arms} onChange={(e) => set("arms", e.target.value)}>{ARMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className={row}><span>Holding</span>
          <div className="flex gap-2">
            <select className="field" value={HOLDS.includes(a.hold) ? a.hold : "other"} onChange={(e) => set("hold", e.target.value === "other" ? "" : e.target.value)}>
              {HOLDS.map((h) => <option key={h} value={h}>{h || "Nothing"}</option>)}<option value="other">Something else…</option>
            </select>
            {!HOLDS.includes(a.hold) || a.hold === "" ? <input className="field" value={a.hold} placeholder="or type any thing: phone, umbrella…" onChange={(e) => set("hold", e.target.value)} /> : null}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.ride} onChange={(e) => set("ride", e.target.checked)} /> Get on it and ride / drive it away (motorcycle, car, cycle…)</label>
        {a.ride && <div className={row}><span>How far (metres)</span><input className="field" type="number" min={2} max={60} value={a.rideDist} onChange={(e) => set("rideDist", Number(e.target.value))} /></div>}
        <div className={row}><span>Effect</span><select className="field" value={a.effect} onChange={(e) => set("effect", e.target.value)}>{EFFECTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className={row}><span>The thing then…</span><select className="field" value={a.change} onChange={(e) => set("change", e.target.value)}>{CHANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        {a.change === "color" && <div className={row}><span>New colour</span><input type="color" value={a.color} onChange={(e) => set("color", e.target.value)} /></div>}
        <div className={row}><span>Sound</span><select className="field" value={a.sound} onChange={(e) => set("sound", e.target.value)}><option value="">No sound</option>{sounds.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className={row}><span>How long</span><input type="range" min={1} max={8} step={0.5} value={a.frames / 24} onChange={(e) => set("frames", Math.round(Number(e.target.value) * 24))} /></div>
        <div className="text-xs text-muted-foreground">{(a.frames / 24).toFixed(1)} seconds</div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={a.closeup} onChange={(e) => set("closeup", e.target.checked)} /> Camera goes close to see it</label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "💾 Save action"}</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
