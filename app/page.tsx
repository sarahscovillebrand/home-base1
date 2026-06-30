"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { fetchDashboardData } from "@/lib/data";
import { Settings, Bill, BillPayment, IncomeLogRow } from "@/lib/types";
import StatusHero from "@/components/StatusHero";
import PaycheckCard from "@/components/PaycheckCard";
import RunwayCard from "@/components/RunwayCard";
import StartupRunwayCard from "@/components/StartupRunwayCard";
import HealthChips from "@/components/HealthChips";
import BottomNav from "@/components/BottomNav";

export default function Dashboard() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [latestIncome, setLatestIncome] = useState<IncomeLogRow | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchDashboardData();
      setSettings(data.settings);
      setBills(data.bills);
      setPayments(data.payments);
      setLatestIncome(data.latestIncome);
      setPeriodLabel(data.periodLabel);
      setError(null);
    } catch (e) {
      setError("Couldn't load data. Check your Supabase env vars.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleTogglePaid(billId: string, nextPaid: boolean) {
    await supabase.from("bill_payments").upsert(
      {
        bill_id: billId,
        period_label: periodLabel,
        paid: nextPaid,
        paid_at: nextPaid ? new Date().toISOString() : null,
      },
      { onConflict: "bill_id,period_label" }
    );
    await load();
  }

  if (loading) {
    return <p className="text-center text-gray-400 mt-10">Loading…</p>;
  }

  if (error || !settings) {
    return (
      <div className="card mt-10 text-center text-sm text-red-600">
        {error ?? "No settings row found. Did you run supabase/schema.sql?"}
      </div>
    );
  }

  const monthLabel = new Date(periodLabel + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <main className="pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 px-1 pb-4">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-lg"
            style={{ background: "#EDE8F8" }}
          >
            🏡
          </div>
          <p className="wordmark flex-1 text-xl">Hello, Sarah!</p>
          <button
            type="button"
            aria-label="Search"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: "#FFFFFF", border: "0.5px solid #EBEBEB" }}
          >
            🔍
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: "#FFFFFF", border: "0.5px solid #EBEBEB" }}
          >
            🔔
          </button>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          <StatusHero settings={settings} />
          <PaycheckCard
            settings={settings}
            bills={bills}
            payments={payments}
            monthLabel={monthLabel}
            onTogglePaid={handleTogglePaid}
          />
          <div className="grid grid-cols-2 gap-3">
            <RunwayCard settings={settings} latestIncome={latestIncome} />
            <HealthChips settings={settings} />
          </div>
          <StartupRunwayCard settings={settings} />
        </div>

        <p className="mt-5 text-center text-xs" style={{ color: "#C8C4D8" }}>
          Tap a bill once it&apos;s paid — you&apos;ll be asked to confirm first.
        </p>
      </main>

      <BottomNav />
    </>
  );
}
