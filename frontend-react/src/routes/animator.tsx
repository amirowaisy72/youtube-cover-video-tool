import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssetLibrary } from "@/components/AssetLibrary";
import { WorldDesigner } from "@/components/WorldDesigner";
import { StoryPreview } from "@/components/StoryPreview";
import { PageHeader } from "@/components/TopBar";
import {
  type AnimatorJob,
  type AnimatorScene,
  animatorContinue,
  animatorJob,
  animatorOptions,
  animatorSaveScript,
  animatorScript,
  animatorStart,
  type Character,
  characterList,
} from "@/lib/api";
import { ENV_KINDS, type EnvKind } from "@/lib/environment";
import { BLUEPRINTS, blueprintFor } from "@/lib/world/blueprints";
import { getKey, installDashboardButton, voiceKeys } from "@/lib/config";
import { KeysNeeded } from "@/components/KeysNeeded";
import { AiStatusBox } from "@/components/AiStatusBox";
import { type JobRow, MyVideos, useJobList } from "@/components/MyVideos";
import { MyVideosLink } from "@/components/VideoLibrary";
import {
  type CharacterConfig,
  characterSvg,
  EXPRESSIONS,
  normalizeCharacter,
  POSES,
} from "@/lib/stickman";

installDashboardButton();

type VoiceEngine = { where: string; reason: string; retry_in: number; last_retry: string; colab_set: boolean;
  avg_colab: number; avg_cpu: number; age: number | null; gpu?: number; link?: number };

/** Where the voices are made right now — Google GPU (Colab) or this computer — and why (user, 2026-11-19). */
function VoiceEngineBox({ v }: { v?: VoiceEngine }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  if (!v) return null;
  const onColab = v.where === "colab";
  const onCpu = v.where === "cpu";
  return (
    <div className={`rounded-xl border p-3 text-sm ${onColab ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
      {!v.where && <p className="text-muted-foreground">Preparing the voices…</p>}
      {onColab && (
        <p className="text-emerald-300">⚡ Running on <b>Google GPU (Colab)</b>{v.avg_colab ? ` · about ${v.avg_colab}s per voice` : ""}
          {v.gpu ? <span className="text-muted-foreground"> (Google's work {v.gpu}s + internet link {v.link}s)</span> : null}</p>
      )}
      {onCpu && (
        <>
          <p className="text-amber-300">🖥 Running on <b>this computer (CPU)</b>{v.avg_cpu ? ` · about ${v.avg_cpu}s per voice` : ""} — slower</p>
          <p className="mt-1 text-muted-foreground">Why not Google: {v.reason || "—"}</p>
          {v.colab_set && (
            <p className="mt-1 text-muted-foreground">{v.retry_in > 0 ? `Trying Google again in ${v.retry_in}s` : "Trying Google again with the next voice"}</p>
          )}
        </>
      )}
      {v.last_retry && v.colab_set && <p className="mt-1 text-xs text-muted-foreground">Last Google try: {v.last_retry}</p>}
      {v.avg_colab > 0 && v.avg_cpu > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">Google ≈ {v.avg_colab}s · this computer ≈ {v.avg_cpu}s per voice</p>
      )}
      {!v.colab_set && (
        <Link to="/dashboard" className="btn btn-secondary btn-sm mt-2">🐢 Running too slow? Connect Google GPU to make this process faster →</Link>
      )}
    </div>
  );
}

export const Route = createFileRoute("/animator")({
  component: Animator,
});

const JOB_KEY = "ytguru-animator-job";
const STEPS = ["Story", "Voices & acting", "Preview", "Final video"];
const STEP_OF: Record<string, number> = {
  queued: 0, writing: 0, script_ready: 0, voicing: 1, backgrounds: 1,
  ready: 2, rendering: 3, done: 4,
};
const SCRIPT_EXAMPLE = `# Scene: classroom (sitting, books)
Ali: Sara, did you finish the homework? {turn-page} [suspicious, think]
Sara: Of course! {laugh} Did you? [happy, hips]
# Time skip: Next morning…
# Scene: street
Ali: My dog ate it… {facepalm} again. [sad, shrug]`;

function store(key: string, value: string | null) {
  try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* private mode */ }
}
function load(key: string): string {
  try { return localStorage.getItem(key) ?? ""; } catch { return ""; }
}

const ACTION_LIST = ["read", "turn-page", "sniff", "laugh", "giggle", "cry", "gasp", "shock", "idea", "think",
  "facepalm", "angry", "eat", "drink", "phone", "sleep", "wake", "jump", "nod", "shake-head", "clap", "dance",
  "scared", "sweat", "love", "dizzy", "look-around", "fall", "walk-out",
  "hmm", "haan", "ohoo", "aah", "uff", "wow", "oops", "yay",
  "walk-to", "step-back", "pace", "run", "chase", "fight", "kick", "push", "hug", "high-five", "climb", "jump-rope",
  "light-fire", "throw", "hide", "swim"];

/** The user's own voice keys (Dashboard), for character voices. */
function ttsKeys(): Record<string, string> {
  return voiceKeys();
}

const DEFAULT_SFX = ["laugh", "giggle", "gasp", "boing", "slap", "punch", "crash", "ding", "whoosh", "pop",
  "applause", "cry", "door", "phone", "horn", "cash", "fail", "magic", "snore", "eat", "drumroll",
  "footsteps", "scream", "angry"];

/** A ready prompt for ChatGPT / Claude / Gemini that returns a script in this tool's own format. */
const WORLD_VERBS = ["go:river", "climb:mango tree", "climb-down", "pick:mango", "eat:mango", "shake:tree", "cut:branch",
  "chop:tree", "throw:stone", "kick:ball", "give:mango", "drop:stone", "carry:log", "push:rock", "swim:river", "fish:river",
  "drink:river", "sit:log", "stand-up", "open:door", "close:door", "enter:hut", "exit", "light:campfire", "hide:bush",
  "look:fish", "cross:bridge", "return"];

function buildAiPrompt(title: string, minutes: number, names: string[], language: "en" | "ur",
                       format: "long" | "reel", sfx: string[], worlds: { name: string; summary: string; uses?: string; fits?: boolean }[] = [], idea = ""): string {
  const fit = worlds.filter((w) => w.fits);
  const words = Math.round(minutes * 140);
  const scenes = Math.max(2, Math.min(14, Math.round(minutes * 2.5)));
  const a = names[0] ?? "Ali", b = names[1] ?? names[0] ?? "Sara";
  return `Write a funny animated cartoon story script for a YouTube ${format === "reel" ? "Short / Reel (vertical, 9:16)" : "video (16:9)"} titled "${title || "your title here"}".

${idea.trim() ? `MY IDEA (most important — build the whole story from it, keep my characters, events and ending, and make it a full, refined, funny script): ${idea.trim()}

` : ""}LENGTH: about ${minutes} minute(s) of spoken dialogue = about ${words} words of dialogue in total, in ${scenes} scenes.
MAIN CHARACTERS: ${names.join(", ") || "Ali, Sara"} (use these exact names). Other characters (animals, Mom, Teacher…) may also speak — the tool creates them.
LANGUAGE: write every dialogue line in ${language === "ur" ? "Urdu script (اردو)" : "simple, natural English"}.
STYLE: like a viral cartoon short — a hook in the very first line, a funny problem, a twist, and a punchline at the end. Short lines (max 20 words each), natural back-and-forth conversation, no narrator.
STORY SENSE (most important): a viewer with the sound OFF must still understand the story from the pictures alone.
- ONE clear story: the first 2 lines say who wants what (the goal or the problem). Every scene moves that story ONE step forward. The ending pays it off (the problem is solved or goes funnily wrong) — no random side jokes that lead nowhere.
- SHOW, DON'T TELL: every important event must HAPPEN on screen, at the moment it happens, with an action — never only be talked about. Magic / a spell / a curse that changes someone: {turn:<Name>:<what>} (e.g. {turn:Teddy:frog}), turning yourself: {become:<what>}, turning back: {turn:<Name>:back}. Leaving: {walk-out}. Falling: {fall}. Eating: {eat:<food>}. Finding: {show:<thing>}.
- EVERY physical event is a tag, so the app can show it: {ride:motorcycle}, {drive:car}, {weld:track}, {fix:door}, {break:window}, {broken:track} (already broken when the scene starts), {explode:car}, {crash:train}, {cook:pan}, {dig:ground}, {paint:wall}, {build:hut}. Use ONLY actions from the lists in this prompt — never invent a new tag (the app cannot show it). Never leave an event only in the words.
- REACT: right after a big event the others react on screen ({gasp}, {shock}, {aah}, {laugh}) before anyone explains it.
- Characters only talk about things that are really there in the scene (or that they bring in with {show:<thing>}).

ACTING (very important): the characters must ACT, not just talk. Put actions in curly braces INSIDE the line, exactly where they happen — before, between or after the words. Use 1-2 actions in most lines, timed for comedy (pause, react, then the punchline).

OUTPUT FORMAT — reply with ONLY the script, inside ONE plain code block (\`\`\`), so every "# Scene:" and "# Time skip:" line keeps its "#" sign. No title, no notes, no bold. Required in every script: at least one "# Scene:" line, and every dialogue line in the exact format below:
# Time skip: <short text>     (optional line, shows a ticking-clock card before the next scene, e.g. "Two hours later…")
# Scene: <place> (<options>)  (options, comma separated, optional: sitting, books, phones)
<Name>: <words> {action} <more words> [<expression>, <pose>, <tone>, <sound effect>]

RULES:
- PLACES: when the story moves, the scene moves — use SEVERAL different places (a new "# Scene:" for most story steps), each one fitting that moment. These places are built in full detail with real 3D models: ${BLUEPRINTS.map((b) => b.label).join(", ")} — plus jungle, waterfall, river, village, mountains, snow. Never keep the whole story in one spot.
- <place> can be ANY place, in a few words: jungle, cave, beach, desert, mountains, snow, farm, village, space, under the sea, hospital, library, stage, gym, inside a bus / train / car / plane, a haunted castle, a zoo… — the tool draws it. Use different, exciting places so the story feels like a real trip.
- options: "sitting" = they sit (bench/sofa/chairs/bed), "books" = they hold books the whole scene (studying), "phones" = they hold phones
- {action} must be one of: ${ACTION_LIST.map((x) => `{${x}}`).join(", ")}
- Transformations (magic, curses, potions): {turn:<Name>:<animal or thing>} turns that character into it with a magic puff — they STAY like that (also in later scenes, and can still talk) until {turn:<Name>:back}. {become:<what>} = the speaker turns into it.
  ({sleep} = lies down in bed with a blanket and snores; {walk-out} = leaves the scene; {idea} = light bulb + ding; {laugh} / {cry} / {gasp} = in the character's own voice)
  Voice sounds that make it lively (said in the character's own voice): {hmm} thinking "Hmmm…", {haan} "Haan?!", {ohoo} "Oh hooo!", {aah} "Aaaah!", {uff} "Uff!", {wow} "Wooow!", {oops} "Oops!", {yay} "Yaaay!" — use them OFTEN, in most lines.
- MOVE them a lot — never let them just stand and talk: {walk-to} (walks up to the other one), {step-back}, {pace}, {run} (runs off and back), {chase} (chases the other one around), {fight} (punches, POW!), {kick}, {push}, {hug}, {high-five}, {climb} (climbs a ladder/tree), {jump-rope}, {light-fire} (strikes a match — a campfire with smoke appears), {throw}, {hide}, {swim}. Use several in every scene.
- ANY other character can talk too — just use a new name: "Monkey: …", "Teacher: …", "Mom: …", "Crocodile: …". The tool makes that character automatically (animals get a real animal body).
- In OUTDOOR scenes the characters really USE the world around them (it is built in 3D with everything you mention): write {verb:thing} exactly where it happens, e.g. "{climb:mango tree} I can see the whole jungle!", "{pick:mango} {eat:mango} Mmm, sweet!", "{swim:river} Come in, the water is cool!", "{chop:tree} TIMBER!". Verbs: ${WORLD_VERBS.map((x) => `{${x}}`).join(", ")}. The thing can be ANYTHING that belongs in that place (trees, fruit, river, fish, rocks, logs, a hut, a door, a campfire, a ball, stones, a bush, a bridge, a boat…). Use 2-4 of them in every outdoor scene — they make it feel like a real trip.${worlds.length ? `
- The user's own 3D worlds (write the world's EXACT name as the place to use one, e.g. "# Scene: ${worlds[0]!.name}"): ${worlds.map((w) => `${w.name} (${w.summary})`).join("; ")}. Whenever a scene happens in a place like one of these, use that world's exact name.` : ""}${fit.length ? `
- THIS STORY FITS the world "${fit[0]!.name}": set most scenes at "# Scene: ${fit[0]!.name}". What is REALLY there, and what the characters can do with each thing: ${fit[0]!.uses || fit[0]!.summary}. Build the story AROUND these things and use them often (that makes the video alive). Do NOT talk about things that are not there — or bring them in with {show:thing}.` : ""}
- When a line talks about an animal or thing that should APPEAR in the scene, add {show:<thing>} right there, e.g. "Look, a {show:cat} cat!" or "{show:pizza} Pizza is here!" — it walks / pops into the scene.
- Motion-graphic panels (a small animated graphic over the film for ~3 seconds) — use about ONE per minute, at a funny or important moment, never two in a row: {meter:<Name>'s patience:90>2} (a level falling/rising), {map:beach>airport>jungle} (a route), {countdown:3}, {chat:Mom:Where are you?} (a phone message), {stars:3} (wanted level), {money:Rs 80000>5000} (money going up/down), {counter:Views:0>1000000}, {pile:coin} (things piling up), {topple:books} (a stack falls over), {scatter:money} (things fly apart), {compare:Spending=9, Saving=2}, {steps:Plan>Steal>Run}, {stamp:BUSTED}, {chapter:Part 2 — The Heist} (a chapter card between big parts).
- Clothes: {wear:vice} (loud shirt + sunglasses), {wear:jacket}, {wear:suit}, {wear:police}, {wear:normal}. A TV / computer / phone screen with text: {screen:BREAKING NEWS}.
- Mark only the 2-3 MOST important words of the WHOLE script with *stars* (the key object of the story, e.g. *magic wand*, *samosa*) — they pop up on screen the moment they are said. Pop-ups must be rare to feel special.
- <expression> must be one of: ${EXPRESSIONS.join(", ")}
- <pose> must be one of: ${POSES.join(", ")}
- <tone> is optional, HOW the line is said: shout (yelling, very loud), whisper, excited, calm. Use shout for angry outbursts and whisper for secrets — the voice really changes.
- <sound effect> is optional: ${sfx.join(", ")}
- Keep it FAST: short replies, quick back-and-forth, reactions instead of long speeches.
- Every dialogue line starts with a character name and a colon.

EXAMPLE:
\`\`\`
# Scene: classroom (sitting, books)
${a}: Okay, no *phones*, no snacks, only studying! [happy, point, ding]
${b}: {hmm} Deal. Chapter one… {turn-page} {sniff} Wait, is that a *samosa* smell? [suspicious, think]
${a}: {haan} FOCUS! The *exam* is tomorrow! {angry} [angry, hips, shout]
# Time skip: Two hours later…
# Scene: bedroom (sitting)
${a}: {uff} Two hours and we finished… *one* page. {facepalm} [sad, shrug, fail]
${b}: {ohoo} Relax. {idea} I have a *genius* plan! [suspicious, wave]
${b}: Sleeping with the *book* under my pillow! {laugh} {sleep} [happy, idle]
# Scene: jungle by the river
${a}: {go:mango tree} {wow} Look, real *mangoes*! {climb:mango tree} [excited, point]
${b}: {shake:tree} Throw some down for me! [happy, wave, shout]
${a}: {pick:mango} Catch! {throw:mango} [happy, point]
${b}: {eat:mango} {yay} So sweet! Now… {swim:river} race you! [happy, wave, excited]
# Scene: jungle by the waterfall
${a}: Watch my new *magic* trick! Abra-ka-dabra! {turn:${b}:frog} [excited, point, shout]
${b}: {aah} Ribbit?! What did you do to me?! [surprised, shrug, shout]
${a}: {oops} Uh oh… the spell to undo it is in the *book* at home! [surprised, facepalm]
# Scene: home
${a}: Found it! Abra-ka-BACK! {turn:${b}:back} [happy, point]
${b}: {wow} I'm me again! {hug} No more magic, ever! [happy, wave]
\`\`\``;
}

function Mini({ ch }: { ch: Character }) {
  const svg = characterSvg(normalizeCharacter(ch.config as Partial<CharacterConfig>), { uid: `m-${ch.id}` });
  return <div className="h-20 w-10" dangerouslySetInnerHTML={{ __html: svg }} />;
}

type SceneEnv = AnimatorScene & { world?: string; world_exact?: boolean; blueprint?: string };
/** What the 3D tool will build for a scene if you change nothing. */
function autoPlace(sc: SceneEnv): string {
  const words = `${sc.location ?? ""} ${sc.place ?? ""}`;
  if (sc.world && sc.world !== "-" && sc.world_exact) return `your world "${sc.world}"`;
  const bp = blueprintFor(words, sc.place ?? "");
  if (bp) return `ready-made ${bp.label}`;
  if (sc.world && sc.world !== "-") return `your world "${sc.world}"`;
  return `built from the words "${(sc.location || sc.place || "").slice(0, 40)}"`;
}

function Animator() {
  const [chars, setChars] = useState<Character[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showWorlds, setShowWorlds] = useState(false);
  // 2D or 3D film (user, 2026-11-16: a full 3D tool, without touching the 2D one)
  const [mode, setModeState] = useState<"2d" | "3d">(() => (load("ytguru-animator-mode") === "3d" ? "3d" : "2d"));
  const setMode = (m: "2d" | "3d") => { setModeState(m); store("ytguru-animator-mode", m); };
  const [title, setTitle] = useState(() => { try { const t = localStorage.getItem("ytguru-title-in-anim"); if (t) { localStorage.removeItem("ytguru-title-in-anim"); return t; } } catch { /* private mode */ } return ""; });
  const [minutes, setMinutes] = useState(1);
  const [format, setFormat] = useState<"long" | "reel">("long");
  const [language, setLanguage] = useState<"en" | "ur">("en");
  const [picked, setPicked] = useState<string[]>([]);
  const [subtitles, setSubtitles] = useState(true);
  // see (and change) each scene's place BEFORE the slow voicing (user, 2026-11-18) — on by default
  const [review, setReviewState] = useState(() => load("ytguru-animator-review") !== "0");
  const setReview = (v: boolean) => { setReviewState(v); store("ytguru-animator-review", v ? "1" : "0"); };
  const [savedWorlds, setSavedWorlds] = useState<string[]>([]);
  const [ownScript, setOwnScriptState] = useState(() => load("ytguru-animator-own") === "1");
  const setOwnScript = (v: boolean) => { setOwnScriptState(v); store("ytguru-animator-own", v ? "1" : null); };
  const [script, setScriptState] = useState(() => load("ytguru-animator-script"));
  const setScript = (v: string) => { setScriptState(v); store("ytguru-animator-script", v || null); };
  // your own rough idea — goes into the copied prompt AND the app's own writer (user, 2026-11-18)
  const [idea, setIdeaState] = useState(() => load("ytguru-animator-idea"));
  const setIdea = (v: string) => { setIdeaState(v); store("ytguru-animator-idea", v || null); };
  const [backgrounds, setBackgrounds] = useState<"drawn" | "pixabay">("drawn");
  const [music, setMusic] = useState("auto");
  const [sfxOn, setSfxOn] = useState(true);
  const [acting, setActing] = useState(() => load("ytguru-animator-acting") !== "0");
  const [musicTracks, setMusicTracks] = useState<{ file: string; name: string; artist: string }[]>([]);
  const [sfxNames, setSfxNames] = useState<string[]>(DEFAULT_SFX);
  const [copied, setCopied] = useState(false);
  const [jobId, setJobId] = useState(() => load(JOB_KEY));
  const [job, setJob] = useState<AnimatorJob | null>(null);
  const [story, setStory] = useState<AnimatorScene[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // My videos + the queue (2026-11-19)
  const [jobs, reloadJobs] = useJobList(true);
  const [autoRender, setAutoRenderState] = useState(() => load("ytguru-auto-render") === "1");
  const setAutoRender = (v: boolean) => { setAutoRenderState(v); store("ytguru-auto-render", v ? "1" : null); };
  const [confirmNew, setConfirmNew] = useState(false);
  const openJob = (j: JobRow) => {
    store(JOB_KEY, j.id); setJobId(j.id); setJob(null); setStory(null); setErr(""); setConfirmNew(false);
  };
  const jobMode = ((job as (AnimatorJob & { mode?: string }) | null)?.mode === "3d" ? "3d" : (job as (AnimatorJob & { mode?: string }) | null)?.mode === "2d" ? "2d" : mode) as "2d" | "3d";
  // films finished videos one after another (the tab must stay open)
  useEffect(() => {
    if (!autoRender) return;
    if (job && job.status === "ready") return; // filming this one now
    const next = [...jobs].reverse().find((j) => j.status === "ready" && j.id !== jobId);
    if (next && (!job || !["script_ready"].includes(job.status))) openJob(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRender, jobs, job?.status]);

  useEffect(() => {
    animatorOptions()
      .then((o) => { setMusicTracks(o.music); if (o.sfx.length) setSfxNames(o.sfx); })
      .catch(() => { /* older backend — defaults are fine */ });
    characterList()
      .then((list) => { setChars(list); setPicked(list.slice(0, 2).map((c) => c.id)); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load characters."));
  }, []);

  // Poll the job; when it needs drawings, draw + upload them, then render.
  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    let timer = 0;
    const tick = async () => {
      try {
        const j = await animatorJob(jobId);
        if (stop) return;
        setJob(j);
        if (j.status === "script_ready" && !story) {
          setStory((await animatorScript(jobId)).scenes);
          try {
            const ws = await (await fetch("/api/worlds")).json();
            const list = Array.isArray(ws) ? ws : ws?.worlds ?? [];
            setSavedWorlds(list.map((w: { name?: string } | string) => (typeof w === "string" ? w : w.name ?? "")).filter(Boolean));
          } catch { /* no saved worlds */ }
        }
        if (!["done", "error", "script_ready", "ready"].includes(j.status)) timer = window.setTimeout(tick, 1500);
      } catch (e) {
        if (!stop) {
          setErr(e instanceof Error ? e.message : "Lost the video job.");
          timer = window.setTimeout(tick, 4000);
        }
      }
    };
    void tick();
    return () => { stop = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, job && ["done", "error", "script_ready", "ready"].includes(job.status) ? "stopped" : "run"]);

  const start = async () => {
    if (busy || !title.trim() || picked.length === 0) return;
    setBusy(true); setErr(""); setStory(null); setJob(null);
    try {
      const { job_id } = await animatorStart({
        title: title.trim(), minutes, format, language, character_ids: picked,
        review, subtitles, custom_script: ownScript ? script : "", pixabay_key: getKey("pixabay"), backgrounds: mode === "3d" ? "drawn" : backgrounds,
        music, sfx: sfxOn, freesound_key: getKey("freesound"), tts_keys: ttsKeys(), ...({ acting, idea: ownScript ? "" : idea.trim(), gemini_key: getKey("gemini"), mode } as Record<string, unknown>),
      });
      store(JOB_KEY, job_id);
      setJobId(job_id);
      reloadJobs();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start.");
    } finally {
      setBusy(false);
    }
  };

  const makeFromStory = async () => {
    if (!story || !jobId) return;
    setBusy(true); setErr("");
    try {
      await animatorSaveScript(jobId, story);
      await animatorContinue(jobId, getKey("pixabay"), getKey("freesound"), ttsKeys());
      setStory(null);
      setJob((j) => (j ? { ...j, status: "voicing", message: "Starting voices…" } : j));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not continue.");
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!jobId) return;
    setErr("");
    try {
      await animatorContinue(jobId, getKey("pixabay"), getKey("freesound"), ttsKeys());
      setJob((j) => (j ? { ...j, status: "voicing", message: "Retrying…" } : j));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Retry failed.");
    }
  };

  // titles the app can REALLY make (user, 2026-11-18: "suggest titles built from what the app has")
  const [titleIdeas, setTitleIdeas] = useState<{ title: string; idea: string; places: string[] }[]>([]);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const suggestTitles = async () => {
    setSuggesting(true); setErr("");
    try {
      const r = await fetch("/api/animator/titles", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character_ids: picked, count: 6, language, gemini_key: getKey("gemini"), avoid: seenTitles }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail ?? "Could not get titles.");
      setTitleIdeas(j.titles ?? []);
      setSeenTitles((s) => [...s, ...(j.titles ?? []).map((t: { title: string }) => t.title)]);
    } catch (e) { setErr(String((e as Error).message)); } finally { setSuggesting(false); }
  };
  const copyPrompt = async () => {
    const names = chars.filter((c) => picked.includes(c.id)).map((c) => c.name);
    let worlds: { name: string; summary: string; uses?: string; fits?: boolean }[] = [];
    try { worlds = (await (await fetch(`/api/worlds?story=${encodeURIComponent(title.trim())}`)).json()).worlds ?? []; } catch { /* no worlds yet */ }
    let caps = "";
    try { caps = String((await (await fetch("/api/animator/capabilities")).json()).text ?? ""); } catch { /* older backend */ }
    const text = buildAiPrompt(title.trim(), minutes, names, language, format, sfxNames, worlds, idea)
      + (caps ? `\n\nWHAT THE APP CAN SHOW (use ONLY these — anything else will not appear in the video):\n${caps}` : "");
    try { await navigator.clipboard.writeText(text); } catch { window.prompt("Copy this prompt:", text); }
    setOwnScript(true);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const reset = () => { store(JOB_KEY, null); setJobId(""); setJob(null); setStory(null); setErr(""); setConfirmNew(false); reloadJobs(); };

  const editLine = (si: number, li: number, patch: Partial<AnimatorScene["lines"][number]>) =>
    setStory((s) => s && s.map((sc, i) => i !== si ? sc : {
      ...sc, lines: sc.lines.map((l, j) => (j === li ? { ...l, ...patch } : l)),
    }));
  const editScene = (si: number, patch: Partial<AnimatorScene>) =>
    setStory((s) => s && s.map((sc, i) => (i === si ? { ...sc, ...patch } : sc)));

  const nameOf = (id: string) => chars.find((c) => c.id === id)?.name ?? "?";
  const storyCast = job ? chars.filter((c) => job.character_ids?.includes(c.id)) : [];
  const step = job ? STEP_OF[job.status] ?? 0 : -1;
  const working = !!job && !["done", "error", "script_ready", "ready"].includes(job.status);

  return (
    <div>
      <PageHeader icon="🎬" title="Story Animator" sub="Type a title and minutes — get a finished cartoon video with your own characters." />
      <div className="mb-3 flex justify-end"><MyVideosLink tool="animator" /></div>
      <MyVideos jobs={jobs} current={jobId} onOpen={openJob} onRefresh={reloadJobs} autoRender={autoRender} setAutoRender={setAutoRender} />

      <div className="mb-4 flex justify-end">
        <div className="mr-auto flex rounded-xl border border-border p-1">
          <button className={`btn btn-sm ${mode === "2d" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("2d")}>🎨 2D cartoon</button>
          <button className={`btn btn-sm ${mode === "3d" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("3d")}>🧊 3D film</button>
        </div>
        <button className="btn btn-secondary mr-2" onClick={() => setShowWorlds((v) => !v)}>
          {showWorlds ? "✕ Close World Designer" : "🌍 3D World Designer"}
        </button>
        <button className="btn btn-secondary" onClick={() => setShowLibrary((v) => !v)}>
          {showLibrary ? "✕ Close Asset Library" : "🗂 Asset Library"}
        </button>
      </div>
      {showWorlds && <div className="mb-6"><WorldDesigner /></div>}
      {mode === "3d" && (
        <div className="glass mb-4 p-4 text-sm">
          🧊 <b>3D film:</b> the same story, voices, music and acting — played as a real 3D world: 3D places, 3D people and
          animals with skeletons, lights, shadows and a camera that moves around them. Outdoors it is a <b>living world</b>:
          trees sway, grass bends under feet, rivers flow with fish — and the characters really climb, pick fruit, swim, chop,
          open doors… when the script says <code>{"{climb:mango tree}"}</code>, <code>{"{pick:mango}"}</code>, <code>{"{swim:river}"}</code>.
          Build your own worlds in the 🌍 3D World Designer. Your 2D videos are not affected.
        </div>
      )}
      {showLibrary && <div className="mb-6"><AssetLibrary /></div>}

      {chars.length === 0 && (
        <div className="glass mb-6 p-5 text-sm">
          You have no characters yet. <Link to="/characters" className="text-primary underline">Create them in Character Studio</Link> first.
        </div>
      )}

      {!jobId && (
        <div className="glass space-y-5 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">Video title</label>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button className="btn btn-secondary btn-sm" disabled={suggesting || picked.length === 0} onClick={() => void suggestTitles()}>
                {suggesting ? "⏳ Thinking…" : titleIdeas.length ? "🔄 More titles" : "💡 Suggest titles the app can make well"}
              </button>
              <span className="text-xs text-muted-foreground">Built only from the places, things and actions the app has — so the video comes out right. Or write your own title.</span>
            </div>
            {titleIdeas.length > 0 && (
              <div className="mb-2 grid gap-2 sm:grid-cols-2">
                {titleIdeas.map((t) => (
                  <button key={t.title} className={`rounded-xl border p-3 text-left text-sm transition hover:border-primary ${title === t.title ? "border-primary bg-primary/10" : "border-border"}`}
                    onClick={() => { setTitle(t.title); setIdea(t.idea); setOwnScript(false); }}>
                    <div className="font-semibold">{t.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{t.idea}</div>
                    {t.places.length > 0 && <div className="mt-1 text-[11px] opacity-70">📍 {t.places.join(" · ")}</div>}
                  </button>
                ))}
              </div>
            )}
            <input className="field text-lg" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ali tries to cook biryani for the first time" />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <div className="mb-1 flex justify-between"><label className="text-sm font-medium">Length</label><span className="chip">{minutes} min</span></div>
              <input type="range" min={0.5} max={10} step={0.5} value={minutes} onChange={(e) => setMinutes(+e.target.value)} className="w-full" disabled={ownScript} />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">Format</div>
              <div className="flex gap-1.5">
                <button className={`btn btn-sm ${format === "long" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFormat("long")}>🖥 Long 16:9</button>
                <button className={`btn btn-sm ${format === "reel" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFormat("reel")}>📱 Reel 9:16</button>
              </div>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">Language</div>
              <div className="flex gap-1.5">
                <button className={`btn btn-sm ${language === "en" ? "btn-primary" : "btn-ghost"}`} onClick={() => setLanguage("en")}>English</button>
                <button className={`btn btn-sm ${language === "ur" ? "btn-primary" : "btn-ghost"}`} onClick={() => setLanguage("ur")}>اردو Urdu</button>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium">Characters in this video ({picked.length})</div>
            <div className="flex flex-wrap gap-2">
              {chars.map((c) => {
                const on = picked.includes(c.id);
                return (
                  <button key={c.id} type="button"
                    onClick={() => setPicked((p) => on ? p.filter((x) => x !== c.id) : [...p, c.id].slice(0, 6))}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-1 transition ${on ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}>
                    <Mini ch={c} />
                    <span className="font-semibold">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={subtitles} onChange={(e) => setSubtitles(e.target.checked)} /> Subtitles</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} /> Let me check the story and each scene's place first</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={ownScript} onChange={(e) => setOwnScript(e.target.checked)} /> I will write my own script</label>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium">💡 Your idea (optional)</div>
            <textarea className="field min-h-20 text-sm" value={idea} onChange={(e) => setIdea(e.target.value)}
              placeholder="A rough direction in your own words, e.g. Peddy finds a magic potion by the river, drinks it and becomes a frog. Teddy has to find the spell book at home to turn him back. Funny ending." />
            <p className="mt-1 text-xs text-muted-foreground">The app's own writer and the copied ChatGPT / Gemini prompt both build the full script from this.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => void copyPrompt()}>{copied ? "✓ Prompt copied!" : "📋 Copy AI prompt"}</button>
            <span className="text-xs text-muted-foreground">Paste it into ChatGPT / Claude / Gemini, then paste the answer below under "I will write my own script".</span>
          </div>

          {ownScript && (
            <div>
              <textarea className="field min-h-56 font-mono text-sm" value={script} onChange={(e) => setScript(e.target.value)} placeholder={SCRIPT_EXAMPLE} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Link to="/planner" className="btn btn-secondary btn-sm" onClick={() => store("ytguru-planner-script", script || null)}>🧭 Check this script in the Script Planner</Link>
                <span className="text-xs text-muted-foreground">Shows exactly what the app cannot show yet — and gets it made for you.</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                One line per sentence: <b>Name: words {"{action}"} more words [expression, pose, tone, sound effect]</b>. Tones: shout, whisper, excited, calm. Put *stars* round a word to make it pop up. {"{show:cat}"} brings a cat (or anything) into the scene. 3D world: {"{climb:mango tree}"} {"{pick:mango}"} {"{swim:river}"} {"{enter:hut}"} — the character really does it. Motion graphics: {"{meter:Patience:90>2}"} {"{map:beach>airport}"} {"{countdown:3}"} {"{chat:Mom:Where are you?}"} {"{stars:3}"} {"{money:Rs 80000>5000}"} {"{pile:coin}"} {"{topple:books}"} {"{stamp:BUSTED}"} {"{chapter:Part 2}"}. Magic: {"{turn:Teddy:frog}"} turns Teddy into a frog (until {"{turn:Teddy:back}"}), {"{become:cat}"} turns the speaker. New scene: <b># Scene: place (sitting, books)</b>. Time card: <b># Time skip: Two hours later…</b>
                Actions: {ACTION_LIST.map((x) => `{${x}}`).join(" ")}.
                Places: ANY place — jungle, cave, beach, inside a bus, a castle… (drawn: {ENV_KINDS.map((k) => k.id).join(", ")}).
                Expressions: {EXPRESSIONS.join(", ")}. Poses: {POSES.join(", ")}.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium">Background music</div>
              <select className="field" value={music} onChange={(e) => setMusic(e.target.value)}>
                <option value="auto">🎵 Auto (fun cartoon music)</option>
                {musicTracks.map((t) => <option key={t.file} value={t.file}>{t.name} — {t.artist}</option>)}
                <option value="none">No music</option>
              </select>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">Sound effects</div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={sfxOn} onChange={(e) => setSfxOn(e.target.checked)} /> Laughs, boings, whooshes, footsteps…
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={acting} onChange={(e) => { setActing(e.target.checked); store("ytguru-animator-acting", e.target.checked ? "1" : "0"); }} />
              🎭 Acting voices — free, every character (shout, whisper, cry, scared, excited…)
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              Uses the Voice Cloner engine on your computer for EVERY voice (Edge / Unreal too), in the mood of each line.
              Slower than plain voices (like cloning), but voiced lines are kept, so re-renders are instant.
              Needs the Voice Cloner set up once. A Gemini key also lets you pick “🎭 Gemini” voices in Character Studio.
              Faster: connect ⚡ Colab GPU voices in the Dashboard.
            </p>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium">Scenes</div>
            <div className="flex flex-wrap gap-1.5">
              <button className={`btn btn-sm ${backgrounds === "drawn" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBackgrounds("drawn")}>🎨 Drawn places (same style as characters)</button>
              {mode === "2d" && <button className={`btn btn-sm ${backgrounds === "pixabay" ? "btn-primary" : "btn-ghost"}`} onClick={() => setBackgrounds("pixabay")}>🖼 Pixabay pictures</button>}
            </div>
          </div>

          <KeysNeeded ids={mode === "2d" && backgrounds === "pixabay" ? ["freesound", "gemini", "pixabay"] : ["freesound", "gemini"]} />
          <AiStatusBox />

          <button className="btn btn-primary w-full py-4 text-lg" disabled={busy || !title.trim() || picked.length === 0 || (ownScript && !script.trim())}
            onClick={() => void start()}>
            {busy ? "Starting…" : jobs.some((j) => ["queued", "writing", "voicing", "backgrounds"].includes(j.status)) ? "➕ Add to the queue (starts after the current video)" : "🎬 Make my video"}
          </button>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}

      {jobId && job && (
        <div className="glass space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">{job.title}</h3>
            {!confirmNew ? (
              <button className="btn btn-ghost btn-sm" onClick={() => (job.status === "done" ? reset() : setConfirmNew(true))}>＋ New video</button>
            ) : (
              <span className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-sm">
                {working || job.status === "waiting" ? "This video keeps being made — open it again from 📂 My videos." : job.status === "ready" ? "This video is not filmed yet — it stays in 📂 My videos." : "This video stays in 📂 My videos."}
                <button className="btn btn-primary btn-sm" onClick={reset}>Yes, new video</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmNew(false)}>Cancel</button>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <span key={s} className={`chip ${i < step ? "text-primary" : i === step && working ? "border-primary" : "opacity-60"}`}>
                {i < step ? "✓" : i === step && working ? "⏳" : "○"} {s}
              </span>
            ))}
          </div>
          {working && <div className="bar"><div style={{ width: `${Math.max(3, job.progress ?? 0)}%` }} /></div>}
          <p className="text-sm text-muted-foreground">{job.message}</p>
          {(job.status === "writing" || job.status === "directing" || job.status === "planning") && <AiStatusBox compact />}
          {job.status === "voicing" && <VoiceEngineBox v={(job as AnimatorJob & { voice_engine?: VoiceEngine }).voice_engine} />}
          {((job as AnimatorJob & { skipped_tags?: string[] }).skipped_tags ?? []).length > 0 && (
            <p className="text-sm text-amber-600">
              ⚠ The app doesn't know these tags, so they are left out of the video:{" "}
              {((job as AnimatorJob & { skipped_tags?: string[] }).skipped_tags ?? []).map((t) => `{${t}}`).join(" ")}
            </p>
          )}
          {err && <p className="text-sm text-destructive">{err}</p>}
          {job.status === "error" && <button className="btn btn-amber" onClick={() => void retry()}>↻ Try again</button>}
          {job.status === "waiting" && (
            <button className="btn btn-ghost btn-sm" onClick={() => void fetch(`/api/animator/jobs/${jobId}/unqueue`, { method: "POST" }).then(reloadJobs)}>Remove from the queue</button>
          )}

          {job.status === "ready" && (
            <StoryPreview key={jobId} jobId={jobId} mode={jobMode} autoRender={autoRender}
              onRebuild={() => setJob((j) => (j ? { ...j, status: "voicing", progress: 15, message: "Fixing the marked parts… (only the changed lines get new voices)" } : j))}
              onDone={(url) => { setJob((j) => (j ? { ...j, status: "done", video_url: url, message: "Your video is ready!" } : j)); reloadJobs(); }} />
          )}

          {job.status === "done" && job.video_url && (
            <div className="space-y-3">
              <video controls src={job.video_url} className={`mx-auto rounded-xl ${job.format === "reel" ? "max-h-[640px]" : "w-full"}`} />
              <a className="btn btn-amber" href={job.video_url} download>⬇ Download MP4</a>
              <a className="btn btn-secondary" href={`/api/animator/jobs/${jobId}/capcut`} download
                title="Picture, voices, sound effects, music and subtitles as separate files — put them all at 0:00 in CapCut">
                📦 Download for CapCut (layers)
              </a>
              <button className="btn btn-secondary" onClick={() => setJob((j) => (j ? { ...j, status: "ready" } : j))}>
                ↩ Back to preview
              </button>
              {job.music_credit && <p className="text-xs text-muted-foreground">{job.music_credit} — add this credit to your video description.</p>}
            </div>
          )}

          {job.status === "script_ready" && story && (
            <div className="space-y-4">
              {story.map((sc, si) => (
                <div key={si} className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="chip">Scene {si + 1}</span>
                    <select className="field w-44" value={sc.place} onChange={(e) => editScene(si, { place: e.target.value as EnvKind })}>
                      {ENV_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={sc.sitting} onChange={(e) => editScene(si, { sitting: e.target.checked })} /> Sitting
                    </label>
                    <input className="field min-w-48 flex-1" value={sc.location} onChange={(e) => editScene(si, { location: e.target.value })} placeholder="Place description" />
                  </div>
                  {mode === "3d" && (() => {
                    const s3 = sc as SceneEnv;
                    const auto = autoPlace(s3);
                    const value = s3.blueprint ? `b:${s3.blueprint}` : s3.world === "-" ? "none" : s3.world && s3.world_exact ? `w:${s3.world}` : "";
                    return (
                      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-primary/5 p-2 text-sm">
                        <span className="font-medium">🌍 Place in 3D:</span>
                        <select className="field min-w-64 flex-1" value={value} onChange={(e) => {
                          const v = e.target.value;
                          editScene(si, (v.startsWith("b:") ? { blueprint: v.slice(2), world: "", world_exact: false }
                            : v.startsWith("w:") ? { blueprint: "", world: v.slice(2), world_exact: true }
                              : v === "none" ? { blueprint: "", world: "-", world_exact: false }
                                : { blueprint: "", world: "", world_exact: false }) as unknown as Partial<AnimatorScene>);
                        }}>
                          <option value="">✨ Auto — {auto}</option>
                          <optgroup label="Ready-made places (detailed)">
                            {BLUEPRINTS.map((b) => <option key={b.id} value={`b:${b.id}`}>{b.inside ? "🏠" : "🏙"} {b.label}</option>)}
                          </optgroup>
                          {savedWorlds.length > 0 && (
                            <optgroup label="Your own worlds">
                              {savedWorlds.map((w) => <option key={w} value={`w:${w}`}>🧩 {w}</option>)}
                            </optgroup>
                          )}
                          <option value="none">🌿 Build it from the place words (no saved world)</option>
                        </select>
                      </div>
                    );
                  })()}
                  <div className="space-y-2">
                    {sc.lines.map((l, li) => (
                      <div key={li} className="flex flex-wrap items-center gap-2">
                        <select className="field w-32" value={l.speaker} onChange={(e) => editLine(si, li, { speaker: e.target.value })}>
                          {storyCast.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input className="field min-w-60 flex-1" value={l.text} onChange={(e) => editLine(si, li, { text: e.target.value })} />
                        <select className="field w-32" value={l.expression} onChange={(e) => editLine(si, li, { expression: e.target.value })}>
                          {EXPRESSIONS.map((x) => <option key={x}>{x}</option>)}
                        </select>
                        <select className="field w-28" value={l.pose} onChange={(e) => editLine(si, li, { pose: e.target.value })}>
                          {POSES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                        <select className="field w-28" value={l.sfx ?? ""} onChange={(e) => editLine(si, li, { sfx: e.target.value })} title="Sound effect">
                          <option value="">🔇 no sound</option>
                          {sfxNames.map((x) => <option key={x} value={x}>🔊 {x}</option>)}
                        </select>
                        <button className="btn btn-ghost btn-sm" title="Delete line"
                          onClick={() => editScene(si, { lines: sc.lines.filter((_, j) => j !== li) })}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm mt-2"
                    onClick={() => editScene(si, { lines: [...sc.lines, { speaker: sc.characters[0] ?? storyCast[0]?.id ?? "", text: "", expression: "normal", pose: "idle", sfx: "" }] })}>
                    ＋ Add line
                  </button>
                  <div className="mt-1 text-xs text-muted-foreground">In this scene: {sc.characters.map(nameOf).join(", ")}</div>
                </div>
              ))}
              <button className="btn btn-primary w-full py-4 text-lg" disabled={busy} onClick={() => void makeFromStory()}>
                {busy ? "Starting…" : "🎬 Make video with this story"}
              </button>
            </div>
          )}
        </div>
      )}
      {jobId && !job && <div className="glass p-6 text-sm text-muted-foreground">Loading…</div>}
    </div>
  );
}
