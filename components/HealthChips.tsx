import { Settings } from "@/lib/types";

function Chip({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-pill px-4 py-2 text-sm"
      style={{ background: ok ? "#D5F2E3" : "#FDE2E1", color: ok ? "#15803D" : "#B91C1C" }}
    >
      <span className="font-medium">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function HealthChips({ settings }: { settings: Settings }) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <Chip label="New credit card debt" ok={!settings.new_cc_debt} value={settings.new_cc_debt ? "Yes" : "No"} />
      <Chip
        label="All minimums covered"
        ok={settings.all_minimums_covered}
        value={settings.all_minimums_covered ? "Yes" : "No"}
      />
    </div>
  );
}
