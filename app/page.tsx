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
    <main>
      <h1 className="text-xl font-semibold text-gray-900">Home Base</h1>
      <p className="text-sm text-gray-400">Pay period starting {periodLabel}</p>

      <div className="mt-4">
        <StatusHero settings={settings} />
      </div>
      <PaycheckCard
        settings={settings}
        bills={bills}
        payments={payments}
        monthLabel={monthLabel}
        onTogglePaid={handleTogglePaid}
      />
      <RunwayCard settings={settings} latestIncome={latestIncome} />
      <StartupRunwayCard settings={settings} />
      <HealthChips settings={settings} />

      <p className="mt-6 text-center text-xs text-gray-300">
        Tap a bill once it's paid — you'll be asked to confirm first.
      </p>
    </main>
  );
}
