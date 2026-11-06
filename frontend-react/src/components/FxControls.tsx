import type { Preset } from "@/lib/app-store";
import type { Rect } from "./CoverStage";

type Fx = Omit<Preset, "id" | "name">;

function Slider({ label, value, min, max, step, onChange, fmt }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{label}</span><span className="chip">{fmt ? fmt(value) : value}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full" />
    </div>
  );
}

export function FxControls({ fx, setFx, rect, setRect }: {
  fx: Fx; setFx: (f: Fx) => void; rect?: Rect; setRect?: (r: Rect) => void;
}) {
  const up = (p: Partial<Fx>) => setFx({ ...fx, ...p });
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button className={`btn btn-sm ${fx.flip ? "btn-primary" : "btn-ghost"}`} onClick={() => up({ flip: !fx.flip })}>⇋ Flip {fx.flip ? "on" : "off"}</button>
        <div className="seg">
          <button data-on={fx.fit === "cover"} onClick={() => up({ fit: "cover" })}>Cover</button>
          <button data-on={fx.fit === "full"} onClick={() => up({ fit: "full" })}>Full</button>
        </div>
      </div>
      <Slider label="Speed" value={fx.speed} min={0.5} max={2} step={0.1} onChange={(v) => up({ speed: v })} fmt={(v) => `${v.toFixed(1)}x`} />
      <Slider label="Zoom" value={fx.zoom} min={0.5} max={2} step={0.05} onChange={(v) => up({ zoom: v })} fmt={(v) => `${v.toFixed(2)}x`} />
      <div className="grid grid-cols-2 gap-4">
        <Slider label="Pan ←→" value={fx.panX} min={-30} max={30} step={1} onChange={(v) => up({ panX: v })} />
        <Slider label="Pan ↑↓" value={fx.panY} min={-30} max={30} step={1} onChange={(v) => up({ panY: v })} />
      </div>
      <div className="rounded-xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-medium">🔊 Voice</span>
          <button className={`btn btn-sm ${fx.voice ? "btn-primary" : "btn-ghost"}`} onClick={() => up({ voice: !fx.voice })}>{fx.voice ? "On" : "Off"}</button>
        </div>
        {fx.voice && <Slider label="Pitch" value={fx.pitch} min={-6} max={6} step={1} onChange={(v) => up({ pitch: v })} fmt={(v) => (v > 0 ? `+${v}` : `${v}`)} />}
      </div>
      {rect && setRect && (
        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 font-medium">🟩 Green area position</div>
          <div className="grid grid-cols-2 gap-4">
            <Slider label="Left" value={rect.x} min={0} max={60} step={0.5} onChange={(v) => setRect({ ...rect, x: v })} />
            <Slider label="Top" value={rect.y} min={0} max={50} step={0.5} onChange={(v) => setRect({ ...rect, y: v })} />
            <Slider label="Width" value={rect.w} min={20} max={100} step={0.5} onChange={(v) => setRect({ ...rect, w: v })} />
            <Slider label="Height" value={rect.h} min={20} max={100} step={0.5} onChange={(v) => setRect({ ...rect, h: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

export function fxSummary(fx: Fx) {
  return `Flip ${fx.flip ? "on" : "off"} · Speed ${fx.speed.toFixed(1)}x · Zoom ${fx.zoom.toFixed(2)}x · Pan ${fx.panX},${fx.panY} · ${fx.fit === "cover" ? "Cover" : "Full"} · Voice ${fx.voice ? `on (pitch ${fx.pitch})` : "off"}`;
}
