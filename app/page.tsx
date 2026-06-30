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

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function HomeIconSVG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function SignOutIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
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
    } catch {
      setError("Couldn't load data. Check your Supabase env vars.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        read_by: [user.email ?? ""],
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
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        }}
      >
        <main className="pb-28 px-4">
          {/* ── Logo + Header ── */}
          <div className="flex items-start justify-between mb-5">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: "#EDE8F8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#5040A0",
                  flexShrink: 0,
                }}
              >
                <HomeIconSVG size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em", color: "#1E1830" }}>
                  homebase
                </h1>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#8070C0", marginTop: 2 }}>
                  Hello, {name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2" style={{ paddingTop: 4 }}>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  border: "0.5px solid #EBEBEB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#B0A8C8",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <SignOutIcon size={16} />
              </button>
              <NotificationBell userEmail={user.email ?? ""} />
            </div>
          </div>

          {/* ── Cards ── */}
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
            Tap a bill to mark it paid — Rent, Discover &amp; Utilities only.
          </p>
        </main>
      </div>

      <BottomNav />
    </>
  );
}
