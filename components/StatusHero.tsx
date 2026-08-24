import { Settings } from "@/lib/types";
import { bufferPct, formatMoney, isOkayThisPaycheck } from "@/lib/calc";

export default function StatusHero({ settings }: { settings: Settings }) {
  const pct = bufferPct(settings);
  const okay = isOkayThisPaycheck(settings);

  return (
    <div className="card" style={{ background: "#F2C8C8" }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#7A2020", opacity: 0.6 }}>
        Checking buffer
      </p>
      <p className="num-display mt-1 text-3xl" style={{ color: "#1E1830" }}>
        {formatMoney(settings.checking_balance)}
      </p>
      <div className="mt-3 h-2 w-full rounded-pill" style={{ background: "rgba(0,0,0,0.08)" }}>
        <div
          className="h-2 rounded-pill"
          style={{
            width: `${Math.min(pct * 100, 100)}%`,
            background: pct >= 1 ? "#7A2020" : pct >= 0.6 ? "#B04040" : "#B91C1C",
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: "#7A2020", opacity: 0.6 }}>
          {Math.round(pct * 100)}% of {formatMoney(settings.buffer_goal)} goal
        </p>
        <span
          className="inline-flex items-center rounded-pill px-3 py-1 text-xs font-bold"
          style={{ background: "rgba(255,255,255,0.6)", color: "#7A2020" }}
        >
          {okay ? "✓ You're okay" : "⚠ Check in"}
        </span>
      </div>
    </div>
  );
}
