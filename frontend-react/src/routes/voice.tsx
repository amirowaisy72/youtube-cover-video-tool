import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { ApiError, speedToTtsRate, ttsGenerate, ttsVoices } from "@/lib/api";

export const Route = createFileRoute("/voice")({
  component: Voice,
});

type VoiceOpt = { id: string; name: string; g: "Male" | "Female"; tone: string };
type Item = {
  id: string; text: string; voice: string; lang: string; secs: number; when: string;
  downloadUrl: string;
};

const HISTORY_KEY = "ytguru-tts-history";

/** Backend label "English (US) — Male, Christopher" -> card fields. */
function parseVoice(id: string, label: string): VoiceOpt {
  const [langPart, rest] = label.split("—").map((s) => s.trim());
  const [g, name] = (rest || "").split(",").map((s) => s.trim());
  return {
    id,
    name: name || id,
    g: g === "Female" ? "Female" : "Male",
    tone: langPart || (id.startsWith("ur-") ? "Urdu" : "English"),
  };
}

function speak(text: string, lang: string, rate: number, female: boolean) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 300));
  u.lang = lang === "Urdu" ? "ur-PK" : "en-US";
  u.rate = rate; u.pitch = female ? 1.3 : 0.8;
  window.speechSynthesis.speak(u);
}

function loadHistory(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Item[];
  } catch {
    return [];
  }
}

function Voice() {
  const [text, setText] = useState("Welcome back to the channel! Today we're diving into ten facts about the universe that will completely blow your mind.");
  const [maxChars, setMaxChars] = useState(10000);
  const [voices, setVoices] = useState<Record<"English" | "Urdu", VoiceOpt[]>>({ English: [], Urdu: [] });
  const [voicesError, setVoicesError] = useState("");
  const [lang, setLang] = useState<"English" | "Urdu">("English");
  const [voice, setVoice] = useState("");
  const [speed, setSpeed] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Item & { engineNote?: string } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pos, setPos] = useState(0);
  const [history, setHistory] = useState<Item[]>(() => loadHistory());
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    ttsVoices()
      .then((data) => {
        setMaxChars(data.max_text_chars || 10000);
        const grouped: Record<"English" | "Urdu", VoiceOpt[]> = { English: [], Urdu: [] };
        for (const v of data.voices || []) {
          const opt = parseVoice(v.id, v.label);
          (v.id.startsWith("ur-") ? grouped.Urdu : grouped.English).push(opt);
        }
        setVoices(grouped);
        if (grouped.English.length) setVoice(grouped.English[0]!.id);
      })
      .catch((e) => setVoicesError(e instanceof Error ? e.message : "Could not load voices."));
  }, []);

  const playItem = (item: Item) => {
    const a = audioRef.current;
    if (!a) return;
    if (playingId === item.id) {
      a.pause();
      setPlayingId(null);
      return;
    }
    window.speechSynthesis?.cancel();
    a.src = item.downloadUrl;
    setPos(0);
    a.play().catch(() => setStatus("Could not play this audio."));
    setPlayingId(item.id);
  };

  const generate = async () => {
    if (!text.trim() || generating) return;
    if (!voice) { setStatus("Please pick a voice first."); return; }
    setGenerating(true);
    setStatus("Generating voiceover… please wait (long scripts take longer).");
    setResult(null);
    try {
      const data = await ttsGenerate(text.trim(), voice, speedToTtsRate(speed));
      const item: Item & { engineNote?: string } = {
        id: data.tts_id,
        text: text.trim(),
        voice: data.voice_label,
        lang,
        secs: Math.max(3, Math.round(text.trim().length / 15 / speed)),
        when: "Just now",
        downloadUrl: data.download_url,
        ...(data.engine !== "edge-tts" && data.engine_note ? { engineNote: data.engine_note } : {}),
      };
      setResult(item);
      setHistory((h) => {
        const next = [item, ...h.filter((x) => x.id !== item.id)].slice(0, 20);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* private mode */ }
        return next;
      });
      setStatus("Done — listen above, or download the MP3.");
    } catch (e) {
      setStatus(
        e instanceof ApiError && e.status === 402
          ? "Not enough credits — activate a license key or top up."
          : `Failed: ${e instanceof Error ? e.message : "Voice generation failed."}`,
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader icon="🎙️" title="Text to Voice" sub="Type it. Pick a voice. Hear it." />
      <audio ref={audioRef} preload="metadata"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setPos((a.currentTime / a.duration) * 100);
        }}
        onEnded={() => { setPlayingId(null); setPos(0); }} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass p-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Your text</h3>
            <span className={`chip ${text.length > maxChars * 0.9 ? "text-amber" : ""}`}>{text.length.toLocaleString()} / {maxChars.toLocaleString()}</span>
          </div>
          <textarea className="field min-h-72 resize-y text-lg leading-relaxed" value={text} maxLength={maxChars}
            onChange={(e) => setText(e.target.value)} placeholder="Paste or type your script here…" />
          <div className="bar mt-3"><div style={{ width: `${(text.length / maxChars) * 100}%` }} /></div>
        </div>

        <div className="glass space-y-6 p-6">
          <div>
            <h3 className="mb-2 font-semibold">Language</h3>
            <div className="seg">
              {(["English", "Urdu"] as const).map((l) => (
                <button key={l} data-on={lang === l} onClick={() => { setLang(l); setVoice(voices[l][0]?.id ?? ""); }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Voice</h3>
            {voicesError && <p className="mb-2 text-sm text-destructive">{voicesError}</p>}
            {voices[lang].length === 0 && !voicesError && <p className="text-sm text-muted-foreground">Loading voices…</p>}
            <div className="grid gap-2">
              {voices[lang].map((x) => (
                <div key={x.id} onClick={() => setVoice(x.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${voice === x.id ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}>
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${x.g === "Female" ? "btn-primary" : "btn-amber"} p-0`}>{x.name[0]}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{x.name} <span className="text-xs text-muted-foreground">· {x.g}</span></div>
                    <div className="text-xs text-muted-foreground">{x.tone}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); speak(lang === "Urdu" ? "Assalam o alaikum, main aap ki awaaz hoon." : `Hi, I'm ${x.name}. Let's make something great.`, lang, speed, x.g === "Female"); }}>▶ Sample</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-between"><h3 className="font-semibold">Speed</h3><span className="chip">{speed.toFixed(1)}x</span></div>
            <input type="range" min={0.5} max={2} step={0.1} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="w-full" />
          </div>
          <button className="btn btn-primary w-full py-4 text-lg" disabled={!text.trim() || generating || !voice} onClick={() => void generate()}>
            {generating ? "Generating…" : "✨ Generate voice · 1 credit"}
          </button>
          {generating && <div className="bar animate-pulseglow"><div style={{ width: "100%" }} /></div>}
          {status && <p className="text-sm text-muted-foreground">{status}</p>}
        </div>
      </div>

      {result && (
        <div className="glass mt-6 flex flex-wrap items-center gap-4 p-6 shadow-[var(--shadow-glow)]">
          <button className="btn btn-primary h-14 w-14 rounded-full p-0 text-xl" onClick={() => playItem(result)}>{playingId === result.id ? "❚❚" : "▶"}</button>
          <div className="min-w-60 flex-1">
            <div className="mb-2 font-semibold">Ready! {result.voice} · {result.lang} · {result.secs}s</div>
            <div className="flex h-10 items-end gap-[3px]">
              {Array.from({ length: 60 }).map((_, i) => (
                <div key={i} className={`flex-1 rounded-full ${playingId === result.id && (i / 60) * 100 < pos ? "bg-primary" : "bg-secondary"}`}
                  style={{ height: `${20 + Math.abs(Math.sin(i * 1.7)) * 80}%` }} />
              ))}
            </div>
            {result.engineNote && <div className="mt-2 text-xs text-amber">{result.engineNote}</div>}
          </div>
          <a className="btn btn-amber" href={result.downloadUrl} download={`voiceover-${result.id}.mp3`}>⬇ Download MP3</a>
        </div>
      )}

      <h3 className="mb-3 mt-10 text-xl font-bold">History</h3>
      {history.length === 0 && <p className="text-sm text-muted-foreground">No voiceovers yet — generate one above.</p>}
      <div className="grid gap-3">
        {history.map((h) => (
          <div key={h.id} className="glass flex items-center gap-4 p-4">
            <span className="chip">{h.lang}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate">{h.text}</div>
              <div className="text-xs text-muted-foreground">{h.voice} · {h.secs}s · {h.when}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => playItem(h)}>{playingId === h.id ? "❚❚" : "▶"}</button>
            <a className="btn btn-ghost btn-sm" href={h.downloadUrl} download={`voiceover-${h.id}.mp3`}>⬇ MP3</a>
          </div>
        ))}
      </div>
    </div>
  );
}
