import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/TopBar";
import { FxControls, fxSummary } from "@/components/FxControls";
import { defaultPreset, useApp, type Preset } from "@/lib/app-store";

export const Route = createFileRoute("/presets")({
  component: Presets,
});

function Presets() {
  const { presets, setPresets, activePresetId, setActivePresetId } = useApp();
  const [editing, setEditing] = useState<Preset | null>(null);

  const save = () => {
    if (!editing || !editing.name.trim()) return;
    const name = editing.name.trim();
    // The preset's name IS its id: a rename replaces the old entry.
    const next = presets.filter((p) => p.id !== editing.id && p.name !== name);
    setPresets([...next, { ...editing, id: name, name }]);
    setEditing(null);
  };

  return (
    <div>
      <PageHeader icon="⚙️" title="Effect Presets" sub="Your saved looks. The active one is used by Auto mode." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          {presets.length === 0 && (
            <p className="text-sm text-muted-foreground">No presets yet — create one, or save a finished video's effects from the Cover Video tool.</p>
          )}
          {presets.map((p) => (
            <div key={p.id} className={`glass p-5 ${activePresetId === p.id ? "shadow-[var(--shadow-glow)] ring-1 ring-primary" : ""}`}>
              <div className="flex items-center gap-3">
                <h3 className="flex-1 text-lg font-bold">{p.name}</h3>
                {activePresetId === p.id
                  ? <span className="chip text-success">● Active</span>
                  : <button className="btn btn-ghost btn-sm" onClick={() => setActivePresetId(p.id)}>Activate</button>}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{fxSummary(p)}</p>
              <div className="mt-3 flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...p })}>✎ Edit</button>
                <button className="btn btn-ghost btn-sm text-destructive" onClick={() => setPresets(presets.filter((x) => x.id !== p.id))}>🗑 Delete</button>
              </div>
            </div>
          ))}
          <button className="btn btn-primary w-full" onClick={() => setEditing({ id: "", name: "", ...defaultPreset })}>+ New preset</button>
        </div>
        <div className="glass p-6">
          {editing ? (
            <>
              <input className="field mb-5 text-lg font-semibold" placeholder="Preset name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <FxControls fx={editing} setFx={(f) => setEditing({ ...editing, ...f })} />
              <div className="mt-6 flex gap-3">
                <button className="btn btn-primary flex-1" disabled={!editing.name.trim()} onClick={save}>Save preset</button>
                <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <div className="grid h-full min-h-60 place-items-center text-center text-muted-foreground">Pick a preset to edit, or create a new one.</div>
          )}
        </div>
      </div>
    </div>
  );
}
