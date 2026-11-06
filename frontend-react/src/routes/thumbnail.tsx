import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PageHeader } from "@/components/TopBar";

export const Route = createFileRoute("/thumbnail")({
  component: Thumbnail,
});

type TemplateId = "big-center" | "text-left" | "top-banner" | "bottom-banner" | "split";

const TEMPLATES: { id: TemplateId; name: string; hint: string }[] = [
  { id: "big-center", name: "Big Text Center", hint: "Huge headline in the middle" },
  { id: "text-left", name: "Text Left", hint: "Headline left, image right" },
  { id: "top-banner", name: "Top Banner", hint: "Headline bar across the top" },
  { id: "bottom-banner", name: "Bottom Banner", hint: "Headline bar across the bottom" },
  { id: "split", name: "Split", hint: "Image left, text panel right" },
];

const COLORS = [
  { id: "white", hex: "#ffffff", name: "White" },
  { id: "yellow", hex: "#ffd200", name: "Yellow" },
  { id: "amber", hex: "#ffaa00", name: "Amber" },
  { id: "red", hex: "#ff463c", name: "Red" },
  { id: "cyan", hex: "#00d2ff", name: "Cyan" },
  { id: "green", hex: "#3cdc78", name: "Green" },
] as const;

function Thumbnail() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [template, setTemplate] = useState<TemplateId>("big-center");
  const [headline, setHeadline] = useState("");
  const [subtext, setSubtext] = useState("");
  const [fontSize, setFontSize] = useState(96);
  const [color, setColor] = useState<string>("#ffffff");
  const [outline, setOutline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please choose an image file (JPG, PNG, WebP)."); return; }
    setError("");
    setResultUrl(null);
    setFile(f);
  };

  const generate = async () => {
    if (!file) { setError("Upload a background image first."); return; }
    if (!headline.trim()) { setError("Type a headline first."); return; }
    setError("");
    setBusy(true);
    setResultUrl(null);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("template", template);
    fd.append("headline", headline.trim());
    fd.append("subtext", subtext.trim());
    fd.append("font_size", String(fontSize));
    fd.append("color", COLORS.find((c) => c.hex === color)?.id ?? "white");
    fd.append("outline", outline ? "true" : "false");
    try {
      const r = await fetch("/api/thumbnail", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Generate failed (${r.status})`);
      if (typeof data.download_url !== "string") throw new Error("Unexpected server reply.");
      setResultUrl(data.download_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed.");
    } finally {
      setBusy(false);
    }
  };

  const headlineStyle = (scale = 0.5): CSSProperties => ({
    fontSize: Math.max(14, Math.round(fontSize * scale)),
    color,
    lineHeight: 1.1,
    textShadow: outline
      ? "2px 0 0 #000, -2px 0 0 #000, 0 2px 0 #000, 0 -2px 0 #000, 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 4px 4px 8px rgba(0,0,0,.7)"
      : "3px 3px 8px rgba(0,0,0,.7)",
  });
  const subStyle: CSSProperties = {
    fontSize: Math.max(11, Math.round(fontSize * 0.5 * 0.42)),
    color: "#ffffff",
    lineHeight: 1.2,
    textShadow: "2px 2px 6px rgba(0,0,0,.8)",
  };

  return (
    <div>
      <PageHeader icon="🎨" title="Thumbnail Maker" sub="Upload a background, pick a template, type a headline — get a 1280×720 thumbnail." />
      <span className="chip mb-6">Free · no credits</span>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <div className="glass p-4">
            {previewUrl ? (
              <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                <img src={previewUrl} alt="Background" className="h-full w-full object-cover" />
                {template === "big-center" && (
                  <>
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
                      <div className="font-display font-bold" style={headlineStyle()}>{headline || "Your headline here"}</div>
                      {subtext && <div className="mt-2" style={subStyle}>{subtext}</div>}
                    </div>
                  </>
                )}
                {template === "text-left" && (
                  <>
                    <div className="absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-black/75 to-transparent" />
                    <div className="absolute left-7 top-1/2 max-w-[55%] -translate-y-1/2 text-left">
                      <div className="font-display font-bold" style={headlineStyle()}>{headline || "Your headline here"}</div>
                      {subtext && <div className="mt-2" style={subStyle}>{subtext}</div>}
                    </div>
                  </>
                )}
                {template === "top-banner" && (
                  <div className="absolute inset-x-0 top-0 flex h-[26%] flex-col items-center justify-center bg-[#101018] px-6 text-center">
                    <div className="font-display font-bold" style={{ ...headlineStyle(), fontSize: Math.min(Math.round(fontSize * 0.5), 42) }}>{headline || "Your headline here"}</div>
                    {subtext && <div className="mt-1" style={{ ...subStyle, fontSize: 13 }}>{subtext}</div>}
                    <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: color }} />
                  </div>
                )}
                {template === "bottom-banner" && (
                  <div className="absolute inset-x-0 bottom-0 flex h-[26%] flex-col items-center justify-center bg-[#101018] px-6 text-center">
                    <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: color }} />
                    <div className="font-display font-bold" style={{ ...headlineStyle(), fontSize: Math.min(Math.round(fontSize * 0.5), 42) }}>{headline || "Your headline here"}</div>
                    {subtext && <div className="mt-1" style={{ ...subStyle, fontSize: 13 }}>{subtext}</div>}
                  </div>
                )}
                {template === "split" && (
                  <div className="absolute right-0 top-0 flex h-full w-[45%] flex-col justify-center border-l-4 bg-[#101018] px-5" style={{ borderColor: color }}>
                    <div className="font-display font-bold" style={{ ...headlineStyle(), fontSize: Math.max(14, Math.round(fontSize * 0.5 * 0.62)) }}>{headline || "Your headline here"}</div>
                    {subtext && <div className="mt-2" style={subStyle}>{subtext}</div>}
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="grid aspect-video w-full place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary">
                <div className="text-center"><div className="text-4xl">⬆</div>Upload a background image (JPG / PNG / WebP)</div>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { onPickFile(e.target.files?.[0]); e.target.value = ""; }} />
            {file && (
              <div className="mt-3 flex items-center gap-3">
                <span className="chip">{file.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>Change image</button>
              </div>
            )}
          </div>

          {resultUrl && (
            <div className="glass p-4">
              <span className="chip mb-3 text-success">✓ Thumbnail ready — 1280×720 JPG</span>
              <img src={resultUrl} alt="Finished thumbnail" className="mt-3 aspect-video w-full rounded-xl object-cover" />
              <div className="mt-4 flex gap-3">
                <a className="btn btn-amber flex-1 py-3" href={resultUrl} download="ytguru-thumbnail.jpg">⬇ Download thumbnail</a>
                <button className="btn btn-ghost" onClick={() => setResultUrl(null)}>Edit again</button>
              </div>
            </div>
          )}
        </div>

        <div className="glass flex flex-col space-y-6 p-6">
          <div>
            <h3 className="mb-2 font-semibold">Template</h3>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`rounded-xl border p-3 text-left transition ${template === t.id ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Headline</h3>
            <input className="field text-lg" value={headline} maxLength={120}
              onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. I TRIED IT FOR 30 DAYS" />
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Subtext <span className="text-xs text-muted-foreground">(optional)</span></h3>
            <input className="field" value={subtext} maxLength={200}
              onChange={(e) => setSubtext(e.target.value)} placeholder="e.g. The results shocked me" />
          </div>

          <div>
            <div className="mb-2 flex justify-between"><h3 className="font-semibold">Font size</h3><span className="chip">{fontSize}px</span></div>
            <input type="range" min={40} max={160} step={4} value={fontSize}
              onChange={(e) => setFontSize(+e.target.value)} className="w-full" />
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Text color</h3>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c.id} title={c.name} onClick={() => setColor(c.hex)}
                  className={`h-9 w-9 rounded-full border-2 transition ${color === c.hex ? "border-primary scale-110" : "border-border"}`}
                  style={{ background: c.hex }} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Text outline</h3>
            <div className="seg">
              <button data-on={outline} onClick={() => setOutline(true)}>On</button>
              <button data-on={!outline} onClick={() => setOutline(false)}>Off</button>
            </div>
          </div>

          <button className="btn btn-primary w-full py-4 text-lg" disabled={busy || !file || !headline.trim()} onClick={() => void generate()}>
            {busy ? "Making thumbnail…" : "🎨 Make thumbnail"}
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-xs text-muted-foreground">Free tool — no credits used. The finished file is a 1280×720 JPG, ready to upload as your YouTube thumbnail.</p>
        </div>
      </div>
    </div>
  );
}
