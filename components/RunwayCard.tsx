import { IncomeLogRow, Settings } from "@/lib/types";
import { formatMoney, lumpRunwayPaychecks } from "@/lib/calc";

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
  const diff = actual - settings.sarah_goal;
  const pct = settings.sarah_goal > 0 ? actual / settings.sarah_goal : 0;

  return (
    <div className="card" style={{ background: "#F8DFC0" }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#7A4010", opacity: 0.6 }}>
        Sarah&apos;s runway
      </p>
      <p className="num-display mt-1 text-2xl" style={{ color: "#1E1830" }}>
        {formatMoney(actual)}
      </p>
      <p className="text-xs font-semibold" style={{ color: "#7A4010", opacity: 0.6 }}>
        of {formatMoney(settings.sarah_goal)}
      </p>
      <div className="mt-3 h-2 w-full rounded-pill" style={{ background: "rgba(0,0,0,0.08)" }}>
        <div
          className="h-2 rounded-pill"
          style={{ width: `${Math.min(pct * 100, 100)}%`, background: "#B06020" }}
        />
      </div>
      <p className="mt-1.5 text-xs font-bold" style={{ color: "#7A4010", opacity: 0.5 }}>
        {Math.round(pct * 100)}% to goal
      </p>
    </div>
  );
}
