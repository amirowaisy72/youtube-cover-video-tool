import { Link } from "@tanstack/react-router";
import { KEY_INFO, type KeyId, useKey } from "@/lib/config";

function Chip({ id, note }: { id: KeyId; note?: string }) {
  const v = useKey(id);
  const info = KEY_INFO.find((k) => k.id === id);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${v
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-border bg-white/5 text-muted-foreground"}`}
      title={v ? "Set in the Dashboard" : `Not set — ${note ?? "optional"}`}>
      {v ? "✓" : "○"} {info?.label ?? id}
    </span>
  );
}

/** Which Dashboard keys this tool uses, and whether they are set —
    keys are no longer typed inside each tool (user, 2026-11-19). */
export function KeysNeeded({ ids, note }: { ids: KeyId[]; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Keys:</span>
      {ids.map((id) => <Chip key={id} id={id} note={note} />)}
      <Link to="/dashboard" className="btn btn-ghost btn-sm">⚙ Manage in Dashboard</Link>
    </div>
  );
}
