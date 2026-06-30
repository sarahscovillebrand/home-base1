import { Settings } from "@/lib/types";
import { startupRunwayWeeks } from "@/lib/calc";

export default function StartupRunwayCard({ settings }: { settings: Settings }) {
  const weeks = startupRunwayWeeks(settings);

  return (
    <div className="card" style={{ background: "#F5C0B4" }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#7A2010", opacity: 0.6 }}>
        Startup runway
      </p>
      <p className="num-display mt-1 text-2xl" style={{ color: "#1E1830" }}>
        {weeks === "covered" ? "Fully covered" : `${weeks} weeks`}
      </p>
      <p className="mt-2 text-xs font-semibold" style={{ color: "#7A2010", opacity: 0.55 }}>
        If Sarah earned $0, Hunter&apos;s paycheck alone covers all bills.
      </p>
    </div>
  );
}
