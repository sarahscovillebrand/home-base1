import { IncomeLogRow, Settings } from "@/lib/types";
import { formatMoney, sarahBreakEvenPerPaycheck } from "@/lib/calc";

export default function RunwayCard({
  settings,
  latestIncome,
}: {
  settings: Settings;
  latestIncome: IncomeLogRow | null;
}) {
  const actual = latestIncome
    ? (latestIncome.source1_amount ?? 0) + (latestIncome.source2_amount ?? 0)
    : 0;
  const breakEven = sarahBreakEvenPerPaycheck(settings);
  const target = settings.sarah_goal;
  const pct = target > 0 ? Math.min(actual / target, 1) : 0;

  // Progress through the three tiers
  const atBreakEven = actual >= breakEven;
  const atTarget    = actual >= target;
  const barColor    = atTarget ? "#5A7A20" : atBreakEven ? "#B06020" : "#B04040";

  return (
    <div className="card" style={{ background: "#F8DFC0" }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#7A4010", opacity: 0.6 }}>
        Sarah&apos;s income
      </p>
      <p className="num-display mt-1 text-2xl" style={{ color: "#1E1830" }}>
        {formatMoney(actual)}
      </p>

      <div className="mt-2 h-2 w-full rounded-pill" style={{ background: "rgba(0,0,0,0.08)" }}>
        <div
          className="h-2 rounded-pill transition-all"
          style={{ width: `${pct * 100}%`, background: barColor }}
        />
      </div>

      {/* Tier labels */}
      <div className="mt-2 flex flex-col gap-0.5">
        <p className="text-xs font-bold" style={{ color: "#7A4010", opacity: atBreakEven ? 1 : 0.45 }}>
          {atBreakEven ? "✓" : "·"} Break even {formatMoney(breakEven)}
        </p>
        <p className="text-xs font-bold" style={{ color: "#7A4010", opacity: atTarget ? 1 : 0.45 }}>
          {atTarget ? "✓" : "·"} Target {formatMoney(target)}
        </p>
        <p className="text-xs font-bold" style={{ color: "#7A4010", opacity: actual >= settings.sarah_stretch_goal ? 1 : 0.45 }}>
          {actual >= settings.sarah_stretch_goal ? "✓" : "·"} Stretch {formatMoney(settings.sarah_stretch_goal)}
        </p>
      </div>
    </div>
  );
}
