import { Settings } from "@/lib/types";
import { startupRunwayWeeks } from "@/lib/calc";

export default function StartupRunwayCard({ settings }: { settings: Settings }) {
  const weeks = startupRunwayWeeks(settings);

  return (
    <div className="card mt-4">
      <p className="text-sm text-gray-500">Startup runway — worst case</p>
      <p className="mt-1 text-xs text-gray-400">
        If Sarah earned $0 starting today, how long the buffer covers the gap between bills and Hunter&apos;s paycheck alone.
      </p>
      <p className="mt-3 text-2xl font-semibold" style={{ color: "#1D4ED8" }}>
        {weeks === "covered" ? "Fully covered" : `${weeks} weeks`}
      </p>
    </div>
  );
}
