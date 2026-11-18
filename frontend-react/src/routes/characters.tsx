import { createFileRoute } from "@tanstack/react-router";
import { GEMINI_VOICES, getGeminiKey } from "@/lib/gemini";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import {
  type Character,
  characterCreate,
  characterDelete,
  characterList,
  characterUpdate,
  ttsProviderVoices,
  ttsVoices,
  voiceCloneList,
} from "@/lib/api";
import { getTtsKey } from "@/lib/keys";
import {
  ACCESSORIES,
  BOTTOM_STYLES,
  type CharacterConfig,
  characterSvg,
  DEFAULT_CHARACTER,
  EXPRESSIONS,
  type Expression,
  HAIR_STYLES,
  HAT_STYLES,
  type Mouth,
  normalizeCharacter,
  type Pose,
  POSES,
  randomCharacter,
  SHOE_STYLES,
  SKINS,
  TOP_STYLES,
} from "@/lib/stickman";

export const Route = createFileRoute("/characters")({
  component: Characters,
});

type VoiceOption = { value: string; type: "edge" | "clone" | "provider"; id: string; label: string; provider?: string };

const PROVIDER_LABELS: Record<string, string> = { unreal: "Unreal Speech", elevenlabs: "ElevenLabs", google: "Google", gemini: "Gemini" };

const TALK_MOUTHS: Mouth[] = ["talk-half", "talk-open", "talk-half", "flat", "talk-open", "o", "talk-half", "flat"];

function CharacterView(props: {
  config: CharacterConfig; uid: string; expression?: Expression; mouth?: Mouth;
  pose?: Pose; blink?: boolean; className?: string;
}) {
  const svg = characterSvg(props.config, {
    uid: props.uid, expression: props.expression, mouth: props.mouth, pose: props.pose, blink: props.blink,
  });
  return <div className={props.className} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Choice<T extends string>(props: {
  label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-medium">{props.label}</div>
      <div className="flex flex-wrap gap-1.5">
        {props.options.map((o) => (
          <button key={o.id} type="button"
            className={`btn btn-sm ${props.value === o.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => props.onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function ColorPick(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="color" value={props.value} onChange={(e) => props.onChange(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5" />
      {props.label}
    </label>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Characters() {
  const [list, setList] = useState<Character[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cfg, setCfg] = useState<CharacterConfig>(DEFAULT_CHARACTER);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voice, setVoice] = useState("");
  const [expression, setExpression] = useState<Expression>("normal");
  const [pose, setPose] = useState<Pose>("idle");
  const [talking, setTalking] = useState(false);
  const [mouth, setMouth] = useState<Mouth | undefined>(undefined);
  const [blink, setBlink] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CharacterConfig>(key: K, value: CharacterConfig[K]) =>
    setCfg((c) => ({ ...c, [key]: value }));

  const refresh = async () => {
    try { setList(await characterList()); } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not load characters.");
    }
  };

  useEffect(() => {
    void refresh();
    // Voices: cloned voices first (the user's own), then Text to Voice.
    void (async () => {
      const opts: VoiceOption[] = [];
      try {
        for (const v of await voiceCloneList()) {
          opts.push({ value: `clone:${v.id}`, type: "clone", id: v.id, label: `🧬 ${v.name} (cloned)` });
        }
      } catch { /* Voice Cloner not set up — fine */ }
      // Premium voices (Unreal Speech / Kokoro, ElevenLabs, Google) appear
      // when their key is saved (Auto Video → Narration voice → Save).
      for (const provider of ["unreal", "elevenlabs", "google"]) {
        const key = getTtsKey(provider);
        if (!key) continue;
        try {
          for (const v of (await ttsProviderVoices(provider, key)).voices || []) {
            opts.push({ value: `provider:${provider}:${v.id}`, type: "provider", provider, id: v.id,
              label: `⭐ ${PROVIDER_LABELS[provider]} — ${v.label}` });
          }
        } catch { /* bad key / offline — skip this provider */ }
      }
      // Gemini acting voices (they shout / whisper / laugh with each line's emotion).
      if (getGeminiKey()) {
        for (const v of GEMINI_VOICES) {
          opts.push({ value: `provider:gemini:${v.id}`, type: "provider", provider: "gemini", id: v.id,
            label: `🎭 Gemini (acts emotions) — ${v.label}` });
        }
      }
      try {
        for (const v of (await ttsVoices()).voices || []) {
          opts.push({ value: `edge:${v.id}`, type: "edge", id: v.id, label: v.label });
        }
      } catch { /* offline — fine */ }
      setVoices(opts);
      setVoice((cur) => cur || opts[0]?.value || "");
    })();
  }, []);

  // Blink every ~3 sec so the preview feels alive.
  useEffect(() => {
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  // "Talk" preview: cycle mouth shapes like lip-sync will do in videos.
  useEffect(() => {
    if (!talking) { setMouth(undefined); return; }
    let i = 0;
    const id = window.setInterval(() => { setMouth(TALK_MOUTHS[i++ % TALK_MOUTHS.length]); }, 130);
    return () => window.clearInterval(id);
  }, [talking]);

  const startNew = () => {
    setEditingId(null); setName(""); setCfg(DEFAULT_CHARACTER); setMsg("");
  };

  const edit = (ch: Character) => {
    setEditingId(ch.id);
    setName(ch.name);
    setCfg(normalizeCharacter(ch.config as Partial<CharacterConfig>));
    if (ch.voice?.id) {
      setVoice(ch.voice.type === "provider" ? `provider:${ch.voice.provider}:${ch.voice.id}` : `${ch.voice.type}:${ch.voice.id}`);
    }
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const v = voices.find((x) => x.value === voice);
    const payload = {
      name: name.trim(),
      voice: v ? { type: v.type, id: v.id, label: v.label, provider: v.provider ?? "" } : { type: "edge" as const, id: "", label: "", provider: "" },
      config: cfg,
    };
    try {
      const saved = editingId ? await characterUpdate(editingId, payload) : await characterCreate(payload);
      setEditingId(saved.id);
      setMsg(`✓ "${saved.name}" saved.`);
      await refresh();
    } catch (e) {
      setMsg(`Failed: ${e instanceof Error ? e.message : "Could not save."}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ch: Character) => {
    if (!window.confirm(`Delete "${ch.name}"?`)) return;
    try {
      await characterDelete(ch.id);
      if (editingId === ch.id) startNew();
      await refresh();
    } catch (e) {
      setMsg(`Failed: ${e instanceof Error ? e.message : "Could not delete."}`);
    }
  };

  const toggleAccessory = (id: CharacterConfig["accessories"][number]) =>
    setCfg((c) => ({
      ...c,
      accessories: c.accessories.includes(id) ? c.accessories.filter((a) => a !== id) : [...c.accessories, id],
    }));

  return (
    <div>
      <PageHeader icon="🧍" title="Character Studio" sub="Design your own cartoon characters. Name them, give them a voice." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Preview */}
        <div className="glass p-6 lg:sticky lg:top-24 lg:self-start">
          <div className="mx-auto aspect-[1/2] max-h-[460px] rounded-2xl bg-gradient-to-b from-sky-200 to-sky-100 p-4">
            <CharacterView config={cfg} uid="preview" expression={expression} pose={pose}
              mouth={mouth} blink={blink} className="h-full w-full" />
          </div>
          <div className="mt-4 text-center text-xl font-bold">{name.trim() || "Unnamed character"}</div>
          <div className="mt-4">
            <div className="mb-1 text-sm font-medium">Expression</div>
            <div className="flex flex-wrap gap-1.5">
              {EXPRESSIONS.map((e) => (
                <button key={e} className={`btn btn-sm ${expression === e ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setExpression(e)}>{cap(e)}</button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <div className="mb-1 text-sm font-medium">Pose</div>
            <div className="flex flex-wrap gap-1.5">
              {POSES.map((p) => (
                <button key={p} className={`btn btn-sm ${pose === p ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setPose(p)}>{cap(p)}</button>
              ))}
            </div>
          </div>
          <button className={`btn mt-4 w-full ${talking ? "btn-amber" : "btn-ghost"}`} onClick={() => setTalking((t) => !t)}>
            {talking ? "■ Stop talking" : "🗣 Talk preview"}
          </button>
        </div>

        {/* Designer */}
        <div className="glass space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">{editingId ? "Edit character" : "New character"}</h3>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => setCfg(randomCharacter())}>🎲 Random</button>
              <button className="btn btn-ghost btn-sm" onClick={startNew}>＋ New</button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ali, Sara, Inspector Khan" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Voice</label>
              <select className="field" value={voice} onChange={(e) => setVoice(e.target.value)}>
                {voices.length === 0 && <option value="">Loading voices…</option>}
                {voices.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">⭐ Unreal Speech / ElevenLabs voices show here after you save their key in Auto Video → Narration voice.</p>
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium">Skin</div>
            <div className="flex flex-wrap items-center gap-2">
              {SKINS.map((s) => (
                <button key={s} type="button" title={s} onClick={() => set("skin", s)}
                  className={`h-9 w-9 rounded-full border-2 ${cfg.skin === s ? "border-primary ring-2 ring-primary" : "border-border"}`}
                  style={{ background: s }} />
              ))}
              <ColorPick label="Custom" value={cfg.skin} onChange={(v) => set("skin", v)} />
            </div>
          </div>

          <Choice label="Hair" value={cfg.hair} options={HAIR_STYLES} onChange={(v) => set("hair", v)} />
          <ColorPick label="Hair colour" value={cfg.hairColor} onChange={(v) => set("hairColor", v)} />

          <Choice label="Hat" value={cfg.hat} options={HAT_STYLES} onChange={(v) => set("hat", v)} />
          {(cfg.hat === "cap" || cfg.hat === "beanie" || cfg.hat === "topi") && (
            <ColorPick label="Hat colour" value={cfg.hatColor} onChange={(v) => set("hatColor", v)} />
          )}

          <Choice label="Top" value={cfg.top} options={TOP_STYLES} onChange={(v) => set("top", v)} />
          <div className="flex flex-wrap gap-4">
            <ColorPick label="Top colour" value={cfg.topColor} onChange={(v) => set("topColor", v)} />
            {(cfg.top === "checks" || cfg.top === "jacket" || cfg.top === "kurta") && (
              <ColorPick label={cfg.top === "jacket" ? "Inner shirt" : "Detail colour"} value={cfg.top2Color} onChange={(v) => set("top2Color", v)} />
            )}
          </div>

          <Choice label="Bottom" value={cfg.bottom} options={BOTTOM_STYLES} onChange={(v) => set("bottom", v)} />
          <ColorPick label="Bottom colour" value={cfg.bottomColor} onChange={(v) => set("bottomColor", v)} />

          <Choice label="Shoes" value={cfg.shoes} options={SHOE_STYLES} onChange={(v) => set("shoes", v)} />
          <ColorPick label="Shoe colour" value={cfg.shoeColor} onChange={(v) => set("shoeColor", v)} />

          <div>
            <div className="mb-1 text-sm font-medium">Extras</div>
            <div className="flex flex-wrap gap-1.5">
              {ACCESSORIES.map((a) => (
                <button key={a.id} className={`btn btn-sm ${cfg.accessories.includes(a.id) ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => toggleAccessory(a.id)}>{a.label}</button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary w-full py-4 text-lg" disabled={!name.trim() || saving} onClick={() => void save()}>
            {saving ? "Saving…" : editingId ? "💾 Save changes" : "💾 Save character"}
          </button>
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </div>
      </div>

      <h3 className="mb-3 mt-10 text-xl font-bold">My characters</h3>
      {list.length === 0 && <p className="text-sm text-muted-foreground">No characters yet — design one above and save it.</p>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((ch) => (
          <div key={ch.id} className={`glass cursor-pointer p-3 transition hover:shadow-[var(--shadow-glow)] ${editingId === ch.id ? "ring-2 ring-primary" : ""}`}
            onClick={() => edit(ch)}>
            <div className="aspect-[1/2] max-h-56 rounded-xl bg-gradient-to-b from-sky-200 to-sky-100 p-2">
              <CharacterView config={normalizeCharacter(ch.config as Partial<CharacterConfig>)} uid={`c-${ch.id}`} className="h-full w-full" />
            </div>
            <div className="mt-2 truncate font-semibold">{ch.name}</div>
            <div className="truncate text-xs text-muted-foreground">{ch.voice?.label || "No voice"}</div>
            <button className="btn btn-ghost btn-sm mt-2 w-full" onClick={(e) => { e.stopPropagation(); void remove(ch); }}>🗑 Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
