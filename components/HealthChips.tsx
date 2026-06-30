import { Settings } from "@/lib/types";

function Chip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <p className="text-xs font-bold" style={{ color: "#1A5040" }}>
      {ok ? "✓" : "✗"} {label}
    </p>
  );
}

export default function HealthChips({ settings }: { settings: Settings }) {
  return (
    <div className="card flex flex-col justify-between" style={{ background: "#B8E8D4" }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#1A5040", opacity: 0.6 }}>
        Health check
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Chip label="No new debt" ok={!settings.new_cc_debt} />
        <Chip label="Minimums covered" ok={settings.all_minimums_covered} />
      </div>
      <p className="mt-4 text-xs font-bold" style={{ color: "#1A5040", opacity: 0.5 }}>
        See details →
      </p>
    </div>
  );
}
