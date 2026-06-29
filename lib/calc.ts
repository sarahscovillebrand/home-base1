import { Settings } from "./types";

// Hunter is paid every other Thursday. Anchor date is a known real payday;
// every period 14 days from it is also a payday. This lets the app figure out
// "this paycheck" automatically without anyone having to update a date by hand.
const ANCHOR_PAYDAY = new Date("2026-06-25T00:00:00Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PERIOD_DAYS = 14;

function periodsSinceAnchor(today: Date = new Date()): number {
  const diffDays = Math.floor((today.getTime() - ANCHOR_PAYDAY.getTime()) / MS_PER_DAY);
  return Math.floor(diffDays / PERIOD_DAYS);
}

export function getCurrentPeriodLabel(today: Date = new Date()): string {
  const periodStart = new Date(ANCHOR_PAYDAY.getTime() + periodsSinceAnchor(today) * PERIOD_DAYS * MS_PER_DAY);
  return periodStart.toISOString().slice(0, 10);
}

export function getNextPaydayLabel(today: Date = new Date()): string {
  const current = new Date(getCurrentPeriodLabel(today) + "T00:00:00Z");
  const next = new Date(current.getTime() + PERIOD_DAYS * MS_PER_DAY);
  return next.toISOString().slice(0, 10);
}

// The anchor payday (2026-06-25) is an "A" paycheck — confirmed against the
// real schedule (the next payday, July 9, is "B"). The letter alternates
// automatically every 14 days from there, so nobody has to remember to flip
// it by hand each period.
const ANCHOR_LETTER: "A" | "B" = "A";

export function getCurrentPaycheckLetter(today: Date = new Date()): "A" | "B" {
  const isEvenPeriodsFromAnchor = periodsSinceAnchor(today) % 2 === 0;
  const isAnchorLetterB = ANCHOR_LETTER === "B";
  const currentIsB = isEvenPeriodsFromAnchor ? isAnchorLetterB : !isAnchorLetterB;
  return currentIsB ? "B" : "A";
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function bufferPct(s: Settings): number {
  if (s.buffer_goal === 0) return 0;
  return s.checking_balance / s.buffer_goal;
}

export function committedThisPaycheck(s: Settings, today: Date = new Date()): number {
  return getCurrentPaycheckLetter(today) === "A" ? s.home_base_committed : s.operations_committed;
}

export function leftAfterBills(s: Settings): number {
  return s.hunter_paycheck - committedThisPaycheck(s);
}

export function isOkayThisPaycheck(s: Settings): boolean {
  return s.checking_balance >= committedThisPaycheck(s);
}

export function startupRunwayWeeks(s: Settings): number | "covered" {
  const perPaycheckObligation = (s.monthly_obligations_total * 12) / 26;
  const shortfall = perPaycheckObligation - s.hunter_paycheck;
  if (shortfall <= 0) return "covered";
  const paychecksOfRunway = s.checking_balance / shortfall;
  return Math.round(paychecksOfRunway * 2 * 10) / 10;
}

export function lumpRunwayPaychecks(s: Settings): number {
  if (s.sarah_goal === 0) return 0;
  return Math.round((s.lump_amount / s.sarah_goal) * 10) / 10;
}
