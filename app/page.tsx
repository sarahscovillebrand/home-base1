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
import AuthGuard, { displayName } from "@/components/AuthGuard";
import NotificationBell from "@/components/NotificationBell";
import type { User } from "@supabase/supabase-js";

export default function Dashboard() {
  return (
    <AuthGuard>
      {(user) => <DashboardInner name={displayName(user)} user={user} />}
    </AuthGuard>
  );
}

function DashboardInner({ name, user }: { name: string; user: User }) {
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

    // Insert a notification so the other person sees what happened
    const bill = bills.find((b) => b.id === billId);
    if (bill) {
      const action = nextPaid ? "marked_paid" : "marked_unpaid";
      const verb = nextPaid ? "marked" : "un-marked";
      await supabase.from("notifications").insert({
        actor_name: name,
        actor_email: user.email ?? "",
        action,
        subject: bill.name,
        message: `${name} ${verb} ${bill.name} as ${nextPaid ? "paid ✓" : "unpaid"}`,
        read_by: [user.email ?? ""],  // actor has already "seen" their own action
      });
    }

    await load();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#F7F7F7" }}>
        <p className="text-sm font-semibold" style={{ color: "#C8C4D8" }}>Loading…</p>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="card mt-10 text-center text-sm" style={{ color: "#B91C1C" }}>
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
          <p className="wordmark flex-1 text-xl">Hello, {name}!</p>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm"
            style={{ background: "#FFFFFF", border: "0.5px solid #EBEBEB" }}
            title="Sign out"
          >
            👋
          </button>
          <NotificationBell userEmail={user.email ?? ""} />
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
