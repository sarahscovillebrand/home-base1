"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard, { displayName } from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import { HousekeepingTask, HousekeepingCompletion } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function GearIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

// ─── Week / date helpers ──────────────────────────────────────────────────────
function getCurrentWeekNumber(): number {
  const today = new Date();
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const anchorUTC = Date.UTC(2026, 5, 28); // June 28 2026 = Week 1 anchor
  const daysDiff = Math.floor((todayUTC - anchorUTC) / (1000 * 60 * 60 * 24));
  const weekOffset = Math.floor(daysDiff / 7);
  return ((weekOffset % 4) + 4) % 4 + 1;
}

function getTodayDOW(): number { return new Date().getDay(); }

function todayDateString(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function getRelativeDayInfo(offset: number): { weekNum: number; dow: number; dateStr: string; label: string } {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const dateUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const anchorUTC = Date.UTC(2026, 5, 28);
  const daysDiff = Math.floor((dateUTC - anchorUTC) / (1000 * 60 * 60 * 24));
  const weekOffset = Math.floor(daysDiff / 7);
  const weekNum = ((weekOffset % 4) + 4) % 4 + 1;
  const dow = date.getDay();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const label = dayNames[dow];
  return { weekNum, dow, dateStr, label };
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTH_NAMES = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

// ─── Weather ──────────────────────────────────────────────────────────────────
type Weather = { temp: number; icon: string; label: string };

function wmoToInfo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀️", label: "Clear" };
  if (code <= 3)  return { icon: "⛅", label: "Partly cloudy" };
  if (code <= 48) return { icon: "🌫️", label: "Foggy" };
  if (code <= 67) return { icon: "🌧️", label: "Rainy" };
  if (code <= 77) return { icon: "❄️", label: "Snowy" };
  if (code <= 82) return { icon: "🌦️", label: "Showers" };
  return { icon: "⛈️", label: "Stormy" };
}

async function fetchWeather(): Promise<Weather | null> {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=40.5865&longitude=-122.3917&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles"
    );
    const json = await res.json();
    const temp = Math.round(json.current.temperature_2m);
    const { icon, label } = wmoToInfo(json.current.weather_code);
    return { temp, icon, label };
  } catch { return null; }
}

// ─── Backlog type ─────────────────────────────────────────────────────────────
type BacklogItem = {
  id: string;
  name: string;
  created_at: string;
  completed_at: string | null;
};

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({
  task, isDone, doneBy, onTap,
}: {
  task: HousekeepingTask;
  isDone: boolean;
  doneBy: string | null;
  onTap: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  async function handle() { setLoading(true); await onTap(); setLoading(false); }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={loading}
      className="w-full text-left"
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px",
        background: "transparent", border: "none", cursor: "pointer",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Circle check */}
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        border: isDone ? "none" : "2px solid #EAC0CC",
        background: isDone ? "#F0D020" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.18s",
      }}>
        {isDone && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="#1C0C16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      {/* Name */}
      <span style={{
        flex: 1, fontSize: 14, fontWeight: 700, color: "#1C0C16",
        textDecoration: isDone ? "line-through" : "none",
        textDecorationColor: "#C090A0",
        opacity: isDone ? 0.35 : 1,
      }}>
        {loading ? "…" : task.name}
      </span>

      {/* Duration */}
      {task.duration && (
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#C04568",
          background: "#FBE4EA", borderRadius: 999,
          padding: "4px 11px", whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {task.duration}
        </span>
      )}

      {/* Blur overlay when done */}
      {isDone && (
        <div style={{
          position: "absolute", inset: 0,
          backdropFilter: "blur(3px)",
          background: "rgba(255,255,255,0.58)",
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          paddingRight: 16,
        }}>
          {doneBy && (
            <span style={{
              background: "#F0D020", borderRadius: 999,
              padding: "4px 13px", fontSize: 10, fontWeight: 900, color: "#1C0C16",
            }}>
              ✓ {doneBy}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Backlog Card ─────────────────────────────────────────────────────────────
function BacklogCard({ item, onToggle }: { item: BacklogItem; onToggle: (item: BacklogItem) => Promise<void> }) {
  const done = !!item.completed_at;
  const [loading, setLoading] = useState(false);
  async function handle() { setLoading(true); await onToggle(item); setLoading(false); }

  return (
    <button type="button" onClick={handle} disabled={loading} style={{
      flexShrink: 0, width: 126, height: 158,
      background: done ? "rgba(255,255,255,0.5)" : "#FFFFFF",
      borderRadius: 24, padding: "16px 14px", cursor: "pointer",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      border: "none", textAlign: "left",
    }}>
      <p style={{
        fontSize: 13, fontWeight: 700, color: "#1C0C16", lineHeight: 1.4,
        textDecoration: done ? "line-through" : "none",
        textDecorationColor: "#C090A0",
        opacity: done ? 0.4 : 1,
      }}>
        {item.name}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
          textTransform: "uppercase", color: "#C04568", opacity: 0.7,
        }}>
          {done ? "Done" : "To do"}
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: done ? "none" : "2px solid #EAC0CC",
          background: done ? "#F0D020" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {done && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="#1C0C16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Add Backlog Card ─────────────────────────────────────────────────────────
function AddBacklogCard({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen() { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }

  async function handleSubmit() {
    const trimmed = val.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setVal(""); setOpen(false);
  }

  if (open) return (
    <div style={{
      flexShrink: 0, width: 160, height: 158,
      background: "#FBE4EA", borderRadius: 24, padding: "14px 13px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <input
        ref={inputRef} value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") { setOpen(false); setVal(""); } }}
        placeholder="e.g. Fix porch light"
        style={{
          background: "rgba(255,255,255,0.8)", border: "none",
          borderRadius: 10, padding: "8px 10px",
          fontSize: 13, fontWeight: 600, color: "#1C0C16", outline: "none", width: "100%",
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={handleSubmit} style={{
          flex: 1, background: "#1C0C16", color: "#F0D020",
          border: "none", borderRadius: 10, padding: "7px 0",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Add</button>
        <button type="button" onClick={() => { setOpen(false); setVal(""); }} style={{
          flex: 1, background: "rgba(0,0,0,0.08)", color: "#888",
          border: "none", borderRadius: 10, padding: "7px 0",
          fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <button type="button" onClick={handleOpen} style={{
      flexShrink: 0, width: 90, height: 158,
      background: "rgba(255,255,255,0.35)", borderRadius: 24,
      border: "2px dashed rgba(28,12,22,0.15)", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
    }}>
      <span style={{ fontSize: 28, color: "#1C0C16", opacity: 0.3 }}>+</span>
      <span style={{ fontSize: 10, fontWeight: 700, color: "#1C0C16", opacity: 0.3 }}>Add task</span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function HouseInner({ user }: { user: User }) {
  const name = displayName(user);
  const router = useRouter();
  const weekNum = getCurrentWeekNumber();
  const dow = getTodayDOW();
  const todayStr = todayDateString();

  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [completions, setCompletions] = useState<HousekeepingCompletion[]>([]);
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetMode, setSheetMode] = useState<"catchup" | "ahead" | null>(null);
  const [sheetTasks, setSheetTasks] = useState<HousekeepingTask[]>([]);
  const [sheetLabel, setSheetLabel] = useState("");
  const [sheetLoading, setSheetLoading] = useState(false);

  const load = useCallback(async () => {
    const [{ data: taskData }, { data: compData }, { data: backlogData }] = await Promise.all([
      supabase.from("housekeeping_tasks").select("*")
        .eq("week_number", weekNum).eq("day_of_week", dow).eq("active", true).order("sort_order"),
      supabase.from("housekeeping_completions").select("*").eq("task_date", todayStr),
      supabase.from("house_backlog").select("*").order("created_at", { ascending: false }),
    ]);
    setTasks((taskData as HousekeepingTask[]) ?? []);
    setCompletions((compData as HousekeepingCompletion[]) ?? []);
    setBacklog((backlogData as BacklogItem[]) ?? []);
    setLoading(false);
  }, [weekNum, dow, todayStr]);

  useEffect(() => { load(); fetchWeather().then(setWeather); }, [load]);

  const handleToggleTask = useCallback(async (task: HousekeepingTask) => {
    const alreadyDone = completions.some(c => c.task_id === task.id && c.completed_by_email === user.email);
    if (alreadyDone) {
      await supabase.from("housekeeping_completions").delete()
        .eq("task_id", task.id).eq("task_date", todayStr).eq("completed_by_email", user.email!);
      await supabase.from("notifications").insert({
        actor_name: name, actor_email: user.email,
        action: "task_unchecked", subject: task.name,
        message: `${name} un-checked "${task.name}"`,
        read_by: [user.email],
      });
    } else {
      await supabase.from("housekeeping_completions").upsert({
        task_id: task.id, completed_by_name: name,
        completed_by_email: user.email!, task_date: todayStr,
      });
      await supabase.from("notifications").insert({
        actor_name: name, actor_email: user.email,
        action: "task_done", subject: task.name,
        message: `${name} completed "${task.name}" ✓`,
        read_by: [user.email],
      });
    }
    await load();
  }, [completions, name, user.email, todayStr, load]);

  const handleToggleBacklog = useCallback(async (item: BacklogItem) => {
    await supabase.from("house_backlog")
      .update({ completed_at: item.completed_at ? null : new Date().toISOString() })
      .eq("id", item.id);
    await load();
  }, [load]);

  async function openCatchUp() {
    setSheetLoading(true);
    setSheetMode("catchup");
    const { weekNum, dow, dateStr, label } = getRelativeDayInfo(-1);
    const [{ data: prevTasks }, { data: prevComps }] = await Promise.all([
      supabase.from("housekeeping_tasks").select("*").eq("week_number", weekNum).eq("day_of_week", dow).eq("active", true).order("sort_order"),
      supabase.from("housekeeping_completions").select("task_id").eq("task_date", dateStr),
    ]);
    const completedIds = new Set((prevComps ?? []).map((c: { task_id: string }) => c.task_id));
    const incomplete = (prevTasks as HousekeepingTask[] ?? []).filter(t => !completedIds.has(t.id));
    setSheetTasks(incomplete);
    setSheetLabel(`${label}'s unfinished tasks`);
    setSheetLoading(false);
  }

  async function openAhead() {
    setSheetLoading(true);
    setSheetMode("ahead");
    const { weekNum, dow, label } = getRelativeDayInfo(1);
    const { data: nextTasks } = await supabase.from("housekeeping_tasks").select("*")
      .eq("week_number", weekNum).eq("day_of_week", dow).eq("active", true).order("sort_order");
    setSheetTasks((nextTasks as HousekeepingTask[]) ?? []);
    setSheetLabel(`${label}'s tasks`);
    setSheetLoading(false);
  }

  const handleAddBacklog = useCallback(async (taskName: string) => {
    await supabase.from("house_backlog").insert({ name: taskName });
    await load();
  }, [load]);

  const today = new Date();
  const dayName = DAY_NAMES[today.getDay()];
  const dateLabel = `${MONTH_NAMES[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
  const doneCount = tasks.filter(t => completions.some(c => c.task_id === t.id)).length;

  return (
    <div style={{
      background: "#F7C5D0",
      minHeight: "100vh",
      paddingBottom: 120,
      maxWidth: 480,
      margin: "0 auto",
    }}>

      {/* ── Header ── */}
      <div style={{
        background: "#E8849A",
        borderRadius: "0 0 40px 40px",
        paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        paddingBottom: 28,
        paddingLeft: 22,
        paddingRight: 22,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FFFBE8", opacity: 0.65, marginBottom: 5 }}>
              Week {weekNum} · Redding
            </p>
            <h1 style={{ fontSize: 38, fontWeight: 900, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {dayName}
            </h1>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#FFFBE8", opacity: 0.75, marginTop: 4 }}>
              {dateLabel}
            </p>
          </div>
          <div style={{ display: "flex", gap: 9, marginTop: 4 }}>
            <NotificationBell userEmail={user.email!} />
            <button type="button" onClick={() => router.push("/house/settings")} style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.35)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
            }}>
              <GearIcon size={17} />
            </button>
          </div>
        </div>

        {/* Stat pills */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{
            flex: 1, background: "rgba(255,255,255,0.4)", borderRadius: 18,
            padding: "11px 15px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>{weather?.icon ?? "☀️"}</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>
                {weather ? `${weather.temp}°F` : "—"}
              </p>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#FFFBE8", opacity: 0.7, marginTop: 2 }}>
                {weather?.label ?? "Loading…"} · Redding
              </p>
            </div>
          </div>
          <div style={{
            flex: 1, background: "rgba(255,255,255,0.4)", borderRadius: 18,
            padding: "11px 15px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F0D020", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>
                {loading ? "—" : doneCount === tasks.length && tasks.length > 0 ? "All done!" : `${doneCount} / ${tasks.length}`}
              </p>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#FFFBE8", opacity: 0.7, marginTop: 2 }}>
                tasks done
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick action + ring cards ── */}
      <div style={{ display: "flex", gap: 12, padding: "20px 16px 0" }}>

        {/* Left: Get Caught Up / Get Ahead */}
        <div style={{
          flex: 1,
          background: "#FFFFFF",
          borderRadius: 24,
          padding: "16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: 148,
        }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1C0C16", opacity: 0.35 }}>
            Quick actions
          </p>
          <button type="button" onClick={openCatchUp} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#FBE4EA", borderRadius: 14, padding: "11px 13px",
            border: "none", cursor: "pointer", textAlign: "left",
          }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#C04568" }}>Get Caught Up</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#C04568", opacity: 0.6, marginTop: 1 }}>Yesterday&apos;s leftovers</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C04568" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button type="button" onClick={openAhead} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#F0EFF8", borderRadius: 14, padding: "11px 13px",
            border: "none", cursor: "pointer", textAlign: "left",
          }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#5040A0" }}>Get Ahead</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#5040A0", opacity: 0.6, marginTop: 1 }}>Tomorrow&apos;s tasks</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5040A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Right: Completion ring */}
        {(() => {
          const total = tasks.length;
          const done = doneCount;
          const r = 38;
          const circ = 2 * Math.PI * r;
          const progress = total > 0 ? (done / total) * circ : 0;
          const allDone = total > 0 && done === total;
          return (
            <div style={{
              flex: 1,
              background: "#FFFFFF",
              borderRadius: 24,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              minHeight: 148,
            }}>
              <div style={{ position: "relative", width: 96, height: 96 }}>
                <svg width="96" height="96" viewBox="0 0 96 96">
                  {/* Background track */}
                  <circle cx="48" cy="48" r={r} fill="none"
                    stroke="rgba(232,132,154,0.15)" strokeWidth="7" />
                  {/* Progress arc */}
                  <circle cx="48" cy="48" r={r} fill="none"
                    stroke={allDone ? "#F0D020" : "#E8849A"} strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${progress} ${circ}`}
                    strokeDashoffset="0"
                    transform="rotate(-90 48 48)" />
                </svg>
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <p style={{ fontSize: 20, fontWeight: 900, color: "#1C0C16", lineHeight: 1 }}>
                    {loading ? "—" : `${done}/${total}`}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 700, color: "#1C0C16", opacity: 0.4, marginTop: 2, letterSpacing: "0.04em" }}>
                    {allDone ? "ALL DONE" : "DONE"}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Tasks ── */}
      <div style={{ padding: "20px 16px 0" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1C0C16", opacity: 0.4, marginBottom: 12, paddingLeft: 4 }}>
          Today&apos;s tasks
        </p>

        {loading ? (
          <p style={{ textAlign: "center", padding: "32px 0", color: "#C04568", fontSize: 14 }}>Loading…</p>
        ) : tasks.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 26, padding: 32, textAlign: "center" }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>🛋️</p>
            <p style={{ fontWeight: 700, color: "#1C0C16" }}>Nothing scheduled today!</p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 26, overflow: "hidden" }}>
            {tasks.map((task, i) => {
              const isDone = completions.some(c => c.task_id === task.id);
              const doneBy = completions.find(c => c.task_id === task.id)?.completed_by_name ?? null;
              return (
                <div key={task.id} style={i > 0 ? { borderTop: "1px solid rgba(232,132,154,0.2)" } : {}}>
                  <TaskRow task={task} isDone={isDone} doneBy={doneBy} onTap={() => handleToggleTask(task)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Task Preview Sheet ── */}
      {sheetMode && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(28,12,22,0.5)",
            display: "flex", alignItems: "flex-end",
          }}
          onClick={() => setSheetMode(null)}
        >
          <div
            style={{
              width: "100%", maxWidth: 480, margin: "0 auto",
              background: "#FFFFFF",
              borderRadius: "28px 28px 0 0",
              padding: "24px 20px max(32px, env(safe-area-inset-bottom))",
              maxHeight: "70vh",
              display: "flex", flexDirection: "column",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)", margin: "0 auto 20px" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1C0C16", opacity: 0.35 }}>
                  {sheetMode === "catchup" ? "Get Caught Up" : "Get Ahead"}
                </p>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#1C0C16", marginTop: 2 }}>{sheetLabel}</p>
              </div>
              <button type="button" onClick={() => setSheetMode(null)} style={{
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: "#F0EFF8", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8070C0" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {sheetLoading ? (
                <p style={{ textAlign: "center", padding: "32px 0", color: "#C8C4D8", fontSize: 14 }}>Loading…</p>
              ) : sheetTasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <p style={{ fontSize: 28, marginBottom: 8 }}>
                    {sheetMode === "catchup" ? "🎉" : "🛋️"}
                  </p>
                  <p style={{ fontWeight: 700, color: "#1C0C16", fontSize: 15 }}>
                    {sheetMode === "catchup" ? "All caught up!" : "Nothing scheduled"}
                  </p>
                </div>
              ) : (
                <div style={{ background: "#F7C5D0", borderRadius: 20, overflow: "hidden" }}>
                  {sheetTasks.map((task, i) => (
                    <div key={task.id} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "13px 16px",
                      borderTop: i > 0 ? "1px solid rgba(232,132,154,0.25)" : "none",
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        border: "2px solid rgba(192,69,104,0.35)",
                        background: "transparent",
                      }} />
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#1C0C16" }}>{task.name}</span>
                      {task.duration && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#C04568",
                          background: "#FBE4EA", borderRadius: 999, padding: "3px 9px", flexShrink: 0,
                        }}>{task.duration}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Backlog ── */}
      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1C0C16", opacity: 0.4, marginBottom: 12, paddingLeft: 20 }}>
          Around the house
        </p>
        <div style={{ display: "flex", gap: 11, overflowX: "auto", padding: "0 16px 16px", scrollbarWidth: "none" }}>
          <AddBacklogCard onAdd={handleAddBacklog} />
          {backlog.map(item => (
            <BacklogCard key={item.id} item={item} onToggle={handleToggleBacklog} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HousePage() {
  return (
    <>
      <AuthGuard>{(user) => <HouseInner user={user} />}</AuthGuard>
      <BottomNav />
    </>
  );
}
