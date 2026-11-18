import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/TopBar";
import {
    type CloneVoice,
    type VoiceCloneJob,
    type VoiceCloneStatus,
    voiceCloneCreate,
    voiceCloneDelete,
    voiceCloneGenerate,
    voiceCloneInstall,
    voiceCloneJob,
    voiceCloneList,
    voiceCloneStatus,
} from "@/lib/api";

export const Route = createFileRoute("/voice-clone")({
    component: VoiceClone,
});

const RECORD_SECONDS = 20;

function VoiceClone() {
    const [engine, setEngine] = useState<VoiceCloneStatus | null>(null);
    const [engineError, setEngineError] = useState("");
    const [voices, setVoices] = useState<CloneVoice[]>([]);
    const [selected, setSelected] = useState("");

    // Step 1 — clone
    const [name, setName] = useState("");
    const [file, setFile] = useState<Blob | null>(null);
    const [fileLabel, setFileLabel] = useState("");
    const [consent, setConsent] = useState(false);
    const [cloning, setCloning] = useState(false);
    const [cloneMsg, setCloneMsg] = useState("");
    const [recording, setRecording] = useState(false);
    const [recSecs, setRecSecs] = useState(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const recTimerRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 2 — voiceover
    const [text, setText] = useState("Welcome back to the channel! Today I have something amazing to share with you.");
    const [language, setLanguage] = useState("en");
    const [exaggeration, setExaggeration] = useState(0.4);
    const [job, setJob] = useState<VoiceCloneJob | null>(null);
    const [genMsg, setGenMsg] = useState("");
    const pollRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const refreshEngine = async () => {
        try {
            const s = await voiceCloneStatus();
            setEngine(s);
            setEngineError("");
            return s;
        } catch (e) {
            setEngineError(e instanceof Error ? e.message : "Could not reach the tool.");
            return null;
        }
    };

    const refreshVoices = async (pick?: string) => {
        try {
            const list = await voiceCloneList();
            setVoices(list);
            setSelected((cur) => pick || (list.some((v) => v.id === cur) ? cur : list[0]?.id ?? ""));
        } catch { /* shown via engine error */ }
    };

    useEffect(() => {
        void refreshEngine();
        void refreshVoices();
        return () => {
            if (pollRef.current) window.clearTimeout(pollRef.current);
            if (recTimerRef.current) window.clearInterval(recTimerRef.current);
            recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // While the engine installs, re-check every 5 sec.
    useEffect(() => {
        if (!engine?.installing) return;
        const id = window.setInterval(() => { void refreshEngine(); }, 5000);
        return () => window.clearInterval(id);
    }, [engine?.installing]);

    const install = async () => {
        try {
            await voiceCloneInstall();
            await refreshEngine();
        } catch (e) {
            setEngineError(e instanceof Error ? e.message : "Install failed.");
        }
    };

    // ------------------------------------------------------------ record
    const stopRecording = () => {
        if (recTimerRef.current) { window.clearInterval(recTimerRef.current); recTimerRef.current = null; }
        if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
        setRecording(false);
    };

    const startRecording = async () => {
        setCloneMsg("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const rec = new MediaRecorder(stream);
            const parts: Blob[] = [];
            rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
            rec.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(parts, { type: rec.mimeType || "audio/webm" });
                setFile(blob);
                setFileLabel(`Recording (${Math.round(blob.size / 1024)} KB)`);
            };
            recorderRef.current = rec;
            rec.start();
            setRecording(true);
            setRecSecs(0);
            let elapsed = 0;
            recTimerRef.current = window.setInterval(() => {
                elapsed += 1;
                setRecSecs(elapsed);
                if (elapsed >= RECORD_SECONDS) stopRecording();
            }, 1000);
        } catch {
            setCloneMsg("Microphone not available — allow mic access, or upload a file instead.");
        }
    };

    // ------------------------------------------------------------- clone
    const clone = async () => {
        if (!file || !name.trim() || !consent || cloning) return;
        setCloning(true);
        setCloneMsg("Saving and cleaning the voice sample…");
        try {
            const v = await voiceCloneCreate(file, name.trim(), consent);
            setCloneMsg(`✓ "${v.name}" is ready (${v.seconds}s sample). Now write a script on the right.`);
            setName(""); setFile(null); setFileLabel(""); setConsent(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            await refreshVoices(v.id);
        } catch (e) {
            setCloneMsg(`Failed: ${e instanceof Error ? e.message : "Could not clone this voice."}`);
        } finally {
            setCloning(false);
        }
    };

    const remove = async (v: CloneVoice) => {
        if (!window.confirm(`Delete the voice "${v.name}"?`)) return;
        try {
            await voiceCloneDelete(v.id);
            await refreshVoices();
        } catch (e) {
            setCloneMsg(`Failed: ${e instanceof Error ? e.message : "Could not delete."}`);
        }
    };

    const playSample = (v: CloneVoice) => {
        const a = audioRef.current;
        if (!a) return;
        a.src = `/api/voiceclone/voices/${v.id}/sample`;
        a.play().catch(() => setCloneMsg("Could not play this sample."));
    };

    // ---------------------------------------------------------- generate
    const poll = (jobId: string, misses = 0) => {
        pollRef.current = window.setTimeout(async () => {
            try {
                let j: VoiceCloneJob;
                try {
                    j = await voiceCloneJob(jobId);
                } catch (err) {
                    if (misses < 5) { poll(jobId, misses + 1); return; }
                    throw err;
                }
                setJob(j);
                if (j.status === "done") { setGenMsg("Done — listen below, or download the MP3."); void refreshEngine(); return; }
                if (j.status === "error") { setGenMsg(j.message || "Voiceover failed."); return; }
                setGenMsg(j.message || "Working…");
                poll(jobId);
            } catch (e) {
                setGenMsg(`Failed: ${e instanceof Error ? e.message : "Lost the job."}`);
            }
        }, 1500);
    };

    const busy = !!job && !["done", "error"].includes(job.status);

    const generate = async () => {
        if (!selected || !text.trim() || busy) return;
        setGenMsg("Starting…");
        try {
            const { job_id } = await voiceCloneGenerate(selected, text.trim(), language, exaggeration);
            setJob({ id: job_id, status: "queued", progress: 0 });
            poll(job_id);
        } catch (e) {
            setGenMsg(`Failed: ${e instanceof Error ? e.message : "Could not start."}`);
        }
    };

    const maxChars = engine?.max_text_chars ?? 10000;
    const selectedVoice = voices.find((v) => v.id === selected);

    return (
        <div>
            <PageHeader icon="🧬" title="Voice Cloner" sub="Give a 15–20 sec voice sample. Get any script spoken in that voice." />
            <audio ref={audioRef} preload="none" />

            {/* Engine status */}
            {engineError && <div className="glass mb-6 p-4 text-sm text-destructive">{engineError}</div>}
            {engine && !engine.installed && (
                <div className="glass mb-6 flex flex-wrap items-center gap-4 p-5">
                    <div className="min-w-60 flex-1">
                        <div className="font-semibold">Voice engine not installed yet</div>
                        <div className="text-sm text-muted-foreground">
                            One-time setup (free, runs on your computer). It downloads a few GB, so it can take 10–30 minutes.
                        </div>
                        {engine.install_error && <div className="mt-2 text-sm text-destructive">{engine.install_error}</div>}
                        {engine.installing && (
                            <div className="mt-2 text-xs text-muted-foreground">
                                <div className="mb-1">⏱ {Math.floor((engine.install_elapsed ?? 0) / 60)} min {(engine.install_elapsed ?? 0) % 60} sec</div>
                                {(engine.install_log ?? []).map((line, i) => (
                                    <div key={i} className="truncate font-mono">{line}</div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="btn btn-primary" disabled={engine.installing} onClick={() => void install()}>
                        {engine.installing ? "Installing… please wait" : "⬇ Install voice engine"}
                    </button>
                    {engine.installing && <div className="bar w-full animate-pulseglow"><div style={{ width: "100%" }} /></div>}
                </div>
            )}
            {engine?.installed && (
                <div className="mb-6 flex flex-wrap gap-2">
                    <span className="chip">✓ Engine ready</span>
                    <span className="chip">{engine.device === "cuda" ? "⚡ GPU" : "🐢 CPU (slower)"}</span>
                    {!engine.model_loaded && !engine.model_cached && <span className="chip">First voiceover downloads the model (~3 GB)</span>}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
                {/* Step 1 — clone a voice */}
                <div className="glass space-y-5 p-6">
                    <h3 className="text-lg font-semibold">1 · Clone a voice</h3>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Voice name</label>
                        <input className="field" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Voice, Ali Narrator" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Voice sample (15–20 sec, clear speech, no music)</label>
                        <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="field"
                            onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                setFile(f);
                                setFileLabel(f ? f.name : "");
                            }} />
                        <div className="mt-2 flex items-center gap-3">
                            {!recording ? (
                                <button className="btn btn-ghost btn-sm" onClick={() => void startRecording()}>🎤 Record {RECORD_SECONDS}s</button>
                            ) : (
                                <button className="btn btn-amber btn-sm" onClick={stopRecording}>■ Stop ({RECORD_SECONDS - recSecs}s left)</button>
                            )}
                            {fileLabel && <span className="truncate text-xs text-muted-foreground">Selected: {fileLabel}</span>}
                        </div>
                        {recording && <div className="bar mt-2"><div style={{ width: `${(recSecs / RECORD_SECONDS) * 100}%` }} /></div>}
                    </div>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                        <span>This is my own voice, or I have the speaker's permission to clone it.</span>
                    </label>
                    <button className="btn btn-primary w-full" disabled={!file || !name.trim() || !consent || cloning || recording} onClick={() => void clone()}>
                        {cloning ? "Cloning…" : "🧬 Clone this voice"}
                    </button>
                    {cloneMsg && <p className="text-sm text-muted-foreground">{cloneMsg}</p>}

                    <div>
                        <h4 className="mb-2 font-semibold">Your cloned voices</h4>
                        {voices.length === 0 && <p className="text-sm text-muted-foreground">No voices yet — clone one above.</p>}
                        <div className="grid gap-2">
                            {voices.map((v) => (
                                <div key={v.id} onClick={() => setSelected(v.id)}
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected === v.id ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}>
                                    <span className="grid h-9 w-9 place-items-center rounded-full btn-primary p-0">{v.name[0]?.toUpperCase()}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{v.name}</div>
                                        <div className="text-xs text-muted-foreground">{v.seconds}s sample</div>
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); playSample(v); }}>▶</button>
                                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); void remove(v); }}>🗑</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Step 2 — voiceover */}
                <div className="glass space-y-5 p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">2 · Voiceover in the cloned voice</h3>
                        <span className={`chip ${text.length > maxChars * 0.9 ? "text-amber" : ""}`}>{text.length.toLocaleString()} / {maxChars.toLocaleString()}</span>
                    </div>
                    <textarea className="field min-h-64 resize-y text-lg leading-relaxed" value={text} maxLength={maxChars}
                        onChange={(e) => setText(e.target.value)} placeholder="Paste or type your script here…" />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-sm font-medium">Script language</label>
                            <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>
                                {(engine?.languages ?? [{ id: "en", label: "English" }]).map((l) => (
                                    <option key={l.id} value={l.id}>{l.label}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-muted-foreground">Urdu script is not supported — write Urdu in Hindi (Devanagari) script and pick Hindi. Roman Urdu does not work well.</p>
                        </div>
                        <div>
                            <div className="mb-1 flex justify-between"><label className="text-sm font-medium">Expressiveness</label><span className="chip">{exaggeration.toFixed(2)}</span></div>
                            <input type="range" min={0.25} max={1.2} step={0.05} value={exaggeration} onChange={(e) => setExaggeration(+e.target.value)} className="w-full" />
                            <p className="mt-1 text-xs text-muted-foreground">0.4 = closest to your voice · higher = more dramatic</p>
                        </div>
                    </div>
                    <button className="btn btn-primary w-full py-4 text-lg"
                        disabled={!engine?.installed || !selected || !text.trim() || busy}
                        onClick={() => void generate()}>
                        {busy ? "Generating…" : `✨ Voiceover${selectedVoice ? ` as "${selectedVoice.name}"` : ""}`}
                    </button>
                    {busy && <div className="bar"><div style={{ width: `${Math.max(5, job?.progress ?? 0)}%` }} /></div>}
                    {genMsg && <p className="text-sm text-muted-foreground">{genMsg}</p>}

                    {job?.status === "done" && job.download_url && (
                        <div className="rounded-xl border border-border p-4">
                            <div className="mb-2 font-semibold">Ready! {job.voice_name} · {job.seconds}s</div>
                            <audio controls src={job.download_url} className="w-full" />
                            <a className="btn btn-amber mt-3" href={job.download_url} download={`cloned-voiceover-${job.id}.mp3`}>⬇ Download MP3</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}