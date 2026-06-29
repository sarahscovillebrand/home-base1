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
    <div className="card mt-4">
      <p className="text-sm text-gray-500">Sarah&apos;s runway goal</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-gray-900">{formatMoney(actual)}</p>
        <p className="text-sm text-gray-400">of {formatMoney(settings.sarah_goal)} goal</p>
      </div>
      <p
        className="mt-1 text-sm font-medium"
        style={{ color: diff >= 0 ? "#15803D" : "#B91C1C" }}
      >
        {diff >= 0 ? `+${formatMoney(diff)} ahead` : `${formatMoney(diff)} to go`}
      </p>
      <div className="mt-3 h-2 w-full rounded-pill bg-gray-100">
        <div
          className="h-2 rounded-pill"
          style={{ width: `${Math.min(pct * 100, 100)}%`, background: "#1D4ED8" }}
        />
      </div>

      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">If a lump payment of {formatMoney(settings.lump_amount)} comes in:</p>
        <p className="text-sm font-medium text-gray-900">
          That buys {lumpRunwayPaychecks(settings)} paychecks of runway
        </p>
      </div>
    </div>
  );
}
