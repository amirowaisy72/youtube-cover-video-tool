import { useEffect, useState } from "react";

/**
 * Asset Library (Story Animator): every picture the cartoons can use —
 * objects, animals, vehicles, food, people and whole place backgrounds.
 * Your own pictures come first; ~4,000 free OpenMoji drawings are found by word.
 */
type Asset = { id: string; name: string; kind: string; tags: string[]; file: string; place?: string; floor?: number };
type Found = { src: string; name: string; kind: string };

const KINDS = ["object", "animal", "vehicle", "food", "person", "place"] as const;
const PLACES = ["park", "street", "home", "office", "classroom", "kitchen", "bedroom", "shop", "restaurant", "police", "plain",
  "jungle", "forest", "beach", "desert", "cave", "mountain", "snow", "farm", "village", "space", "underwater", "hospital",
  "library", "stage", "gym", "bus", "train", "car", "plane"];
const fileUrl = (src: string) => `/api/assets/file/${encodeURIComponent(src)}`;

function aiPrompt(name: string, kind: string, place: string): string {
  if (kind === "place") {
    return `Draw a simple flat cartoon background of a ${place || name} (${name}) as SVG code, for a 2D stickman cartoon.
Rules: viewBox="0 0 1280 720"; thick dark outlines (stroke="#1b1b1b" stroke-width="4"); flat bright friendly colours, no gradients, no text, no people or animals; the floor line is at y=590 (82% down) and the floor below it is plain; keep the MIDDLE of the picture fairly empty (characters stand there); put details (windows, doors, shelves, posters, plants…) near the left and right sides and on the back wall.
Reply with ONLY the SVG code inside one code block.`;
  }
  return `Draw a simple flat cartoon ${name} (a ${kind}) as SVG code, for a 2D stickman cartoon.
Rules: viewBox="0 0 200 200"; thick dark outlines (stroke="#1b1b1b" stroke-width="5", round joins); flat bright friendly colours, no gradients, no text, transparent background; side view${kind === "animal" || kind === "vehicle" ? ", FACING LEFT, standing on the bottom edge" : ""}; cute and very readable when small.
Reply with ONLY the SVG code inside one code block.`;
}

export function AssetLibrary() {
  const [mine, setMine] = useState<Asset[]>([]);
  const [found, setFound] = useState<Found[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // add form
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [kind, setKind] = useState<string>("object");
  const [place, setPlace] = useState("classroom");
  const [floor, setFloor] = useState(0.82);
  const [svg, setSvg] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const search = async (text = q) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/assets/search?q=${encodeURIComponent(text)}`);
      const data = await res.json();
      setMine(data.mine ?? []);
      setFound(data.openmoji ?? []);
    } catch {
      setMsg("Could not load the library.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { void search(""); }, []);

  const add = async () => {
    if (!name.trim()) { setMsg("Give it a name first (e.g. cat, school bus, my classroom)."); return; }
    setBusy(true);
    setMsg("");
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("name", name);
        form.append("tags", tags);
        form.append("kind", kind);
        form.append("place", kind === "place" ? place : "");
        form.append("floor", String(floor));
        res = await fetch("/api/assets", { method: "POST", body: form });
      } else if (svg.trim()) {
        res = await fetch("/api/assets/svg", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ svg, name, tags, kind, place: kind === "place" ? place : "", floor }),
        });
      } else {
        setMsg("Choose a picture file, or paste SVG code.");
        return;
      }
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? "Could not add it.");
      setMsg(`✓ "${name}" added — videos will use it from now on.`);
      setName(""); setTags(""); setSvg(""); setFile(null);
      await search(q);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const keep = async (f: Found) => {
    const res = await fetch(`/api/assets/save/${encodeURIComponent(f.src)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: q || f.name, tags: `${f.name}`, kind: f.kind }),
    });
    setMsg(res.ok ? `✓ Saved "${q || f.name}" to your pictures.` : "Could not save it.");
    await search(q);
  };

  const remove = async (a: Asset) => {
    if (!window.confirm(`Delete "${a.name}"?`)) return;
    await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
    await search(q);
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(aiPrompt(name || q || "thing", kind, place));
    setMsg("📋 Prompt copied — paste it into ChatGPT / Claude / Gemini, then paste the SVG code it gives you below.");
  };

  return (
    <div className="glass space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold">🗂 Asset Library</h2>
        <p className="text-sm text-muted-foreground">
          Everything the cartoons can show. When a story talks about something (a cat, a bus, a cake…) the video
          finds its picture here — your own pictures first, then thousands of free OpenMoji drawings. Add your own
          places too: they become extra looks for that place, so videos never look the same.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input className="field flex-1" placeholder="Search: cat, bus, pizza, rocket…" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
        <button className="btn btn-secondary" onClick={() => void search()} disabled={busy}>🔍 Search</button>
      </div>

      {mine.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">⭐ Your pictures ({mine.length})</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {mine.map((a) => (
              <div key={a.id} className="group relative rounded-xl border border-border bg-white/90 p-1 text-center">
                <img src={fileUrl(`lib:${a.id}`)} alt={a.name} className="mx-auto h-16 w-full object-contain" />
                <p className="truncate text-[11px] text-slate-700">{a.name}{a.kind === "place" ? ` · ${a.place}` : ""}</p>
                <button className="absolute right-1 top-1 hidden rounded bg-black/60 px-1 text-xs text-white group-hover:block"
                  onClick={() => void remove(a)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {found.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">OpenMoji drawings for “{q}” — click ⭐ to keep one as yours</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {found.map((f) => (
              <div key={f.src} className="group relative rounded-xl border border-border bg-white/90 p-1 text-center">
                <img src={fileUrl(f.src)} alt={f.name} loading="lazy" className="mx-auto h-16 w-full object-contain" />
                <p className="truncate text-[11px] text-slate-700">{f.name}</p>
                <button className="absolute right-1 top-1 hidden rounded bg-amber-500 px-1 text-xs text-white group-hover:block"
                  onClick={() => void keep(f)}>⭐</button>
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">OpenMoji (openmoji.org), CC BY-SA 4.0 — the video's credit line says so when they are used.</p>
        </div>
      )}

      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-medium">➕ Add your own picture</p>
        <div className="flex flex-wrap gap-2">
          <input className="field w-48" placeholder="Name (e.g. cat)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="field flex-1" placeholder="Other words for it, comma separated (kitty, billi)" value={tags}
            onChange={(e) => setTags(e.target.value)} />
          <select className="field w-32" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k} value={k}>{k === "place" ? "place (background)" : k}</option>)}
          </select>
          {kind === "place" && (
            <select className="field w-32" value={place} onChange={(e) => setPlace(e.target.value)}>
              {PLACES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
        {kind === "place" && (
          <label className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0">Floor line in the picture</span>
            <input type="range" min={0.5} max={0.98} step={0.01} value={floor} className="flex-1"
              onChange={(e) => setFloor(Number(e.target.value))} />
            <span className="chip w-16 justify-center">{Math.round(floor * 100)}%</span>
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept=".svg,.png,.jpg,.jpeg,.webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <span className="text-xs text-muted-foreground">or</span>
          <button className="btn btn-ghost btn-sm" onClick={() => void copyPrompt()}>📋 Copy AI prompt to draw it</button>
        </div>
        <textarea className="field h-24 font-mono text-xs" placeholder="…or paste SVG code here (<svg …> … </svg>)"
          value={svg} onChange={(e) => setSvg(e.target.value)} />
        <button className="btn btn-primary" onClick={() => void add()} disabled={busy}>Add to library</button>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
    </div>
  );
}
