import { supabase } from "./supabaseClient";
import { Settings, Bill, BillPayment, IncomeLogRow } from "./types";
import { getCurrentPeriodLabel } from "./calc";

export async function fetchDashboardData() {
  const periodLabel = getCurrentPeriodLabel();

  const [{ data: settingsRows }, { data: bills }, { data: payments }, { data: incomeRows }] =
    await Promise.all([
      supabase.from("settings").select("*").eq("id", 1).limit(1),
      supabase.from("bills").select("*").order("sort_order"),
      supabase.from("bill_payments").select("*").eq("period_label", periodLabel),
      supabase.from("income_log").select("*").order("paycheck_date", { ascending: false }).limit(1),
    ]);

  const settings = (settingsRows?.[0] ?? null) as Settings | null;

  return {
    settings,
    bills: (bills ?? []) as Bill[],
    payments: (payments ?? []) as BillPayment[],
    latestIncome: (incomeRows?.[0] ?? null) as IncomeLogRow | null,
    periodLabel,
  };
}
