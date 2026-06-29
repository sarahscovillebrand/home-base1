import { Settings } from "@/lib/types";
import { bufferPct, formatMoney, isOkayThisPaycheck } from "@/lib/calc";

export default function StatusHero({ settings }: { settings: Settings }) {
  const pct = bufferPct(settings);
  const okay = isOkayThisPaycheck(settings);

  return (
    <div className="card">
      <p className="text-sm text-gray-500">Checking buffer</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">
        {formatMoney(settings.checking_balance)}
      </p>
      <div className="mt-3 h-2 w-full rounded-pill bg-gray-100">
        <div
          className="h-2 rounded-pill"
          style={{
            width: `${Math.min(pct * 100, 100)}%`,
            background: pct >= 1 ? "#15803D" : pct >= 0.6 ? "#1D4ED8" : "#B91C1C",
          }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {Math.round(pct * 100)}% of your {formatMoney(settings.buffer_goal)} buffer goal
      </p>
      <p
        className="mt-4 inline-block rounded-pill px-3 py-1 text-sm font-medium"
        style={{
          background: okay ? "#D5F2E3" : "#FEF3C7",
          color: okay ? "#15803D" : "#92400E",
        }}
      >
        {okay ? "You're okay this paycheck" : "Check in — buffer is tight"}
      </p>
    </div>
  );
}
