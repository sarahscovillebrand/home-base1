"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard, { displayName } from "@/components/AuthGuard";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────
type HouseReminder = {
  id: string;
  title: string;
  category: "household" | "cars" | "kids" | "medical" | "other";
  due_date: string | null;
  notes: string | null;
  completed: boolean;
  created_by: string | null;
  created_at: string;
};

const REMINDER_CATS = [
  { key: "all",       label: "All",       emoji: "📋" },
  { key: "household", label: "Household", emoji: "🏠" },
  { key: "cars",      label: "Cars",      emoji: "🚗" },
  { key: "kids",      label: "Kids",      emoji: "👧" },
  { key: "medical",   label: "Medical",   emoji: "🏥" },
  { key: "other",     label: "Other",     emoji: "📌" },
] as const;
type ReminderCatKey = typeof REMINDER_CATS[number]["key"];

function formatDueDate(dateStr: string | null): { label: string; overdue: boolean } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const overdue = diff < 0;
  let label = "";
  if (diff === 0) label = "Today";
  else if (diff === 1) label = "Tomorrow";
  else if (diff === -1) label = "Yesterday";
  else if (diff < 0) label = `${Math.abs(diff)}d overdue`;
  else if (diff <= 7) label = `In ${diff} days`;
  else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label, overdue };
}

// ─── Add Reminder Sheet ───────────────────────────────────────────────────────
function AddReminderSheet({ onClose, onSave }: {
  onClose: () => void;
  onSave: (title: string, cat: Exclude<ReminderCatKey,"all">, due: string | null) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<Exclude<ReminderCatKey,"all">>("household");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(title.trim(), cat, due || null);
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(28,12,22,0.5)", display: "flex", alignItems: "flex-end" }}
      onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "#FFFFFF", borderRadius: "28px 28px 0 0", padding: "24px 20px calc(32px + env(safe-area-inset-bottom))" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)", margin: "0 auto 20px" }} />
        <p style={{ fontSize: 20, fontWeight: 900, color: "#1C0C16", marginBottom: 16 }}>New reminder</p>

        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
          onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
          style={{ width: "100%", padding: "13px 16px", borderRadius: 14, border: "2px solid rgba(232,132,154,0.3)", fontSize: 15, fontWeight: 600, color: "#1C0C16", background: "#FFF8FA", outline: "none", marginBottom: 14, boxSizing: "border-box" }} />

        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C04568", opacity: 0.6, marginBottom: 8 }}>Category</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {REMINDER_CATS.filter(c => c.key !== "all").map(c => {
            const sel = cat === c.key;
            return (
              <button key={c.key} type="button" onClick={() => setCat(c.key as Exclude<ReminderCatKey,"all">)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 999, border: "none", cursor: "pointer",
                  background: sel ? "#E8849A" : "rgba(232,132,154,0.12)",
                  color: sel ? "#FFFFFF" : "#C04568", fontSize: 13, fontWeight: 700 }}>
                <span>{c.emoji}</span><span>{c.label}</span>
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C04568", opacity: 0.6, marginBottom: 8 }}>Due date (optional)</p>
        <input type="date" value={due} onChange={e => setDue(e.target.value)}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 14, border: "2px solid rgba(232,132,154,0.3)", fontSize: 14, fontWeight: 600, color: "#1C0C16", background: "#FFF8FA", outline: "none", marginBottom: 22, boxSizing: "border-box" }} />

        <button type="button" onClick={handleSave} disabled={!title.trim() || saving}
          style={{ width: "100%", background: title.trim() ? "#E8849A" : "rgba(232,132,154,0.3)", color: "#FFFFFF", border: "none", borderRadius: 999, padding: "14px 0", fontSize: 15, fontWeight: 800, cursor: title.trim() ? "pointer" : "default" }}>
          {saving ? "Adding…" : "Add reminder"}
        </button>
      </div>
    </div>
  );
}

// ─── Reminder Row ─────────────────────────────────────────────────────────────
function ReminderRow({ reminder, onComplete, onDelete, showDivider }: {
  reminder: HouseReminder;
  onComplete: (id: string, done: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showDivider: boolean;
}) {
  const due = formatDueDate(reminder.due_date);
  const catInfo = REMINDER_CATS.find(c => c.key === reminder.category)!;

  return (
    <div style={{ borderTop: showDivider ? "1px solid rgba(232,132,154,0.15)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        {/* Check button */}
        <button type="button" onClick={() => onComplete(reminder.id, !reminder.completed)}
          style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            border: reminder.completed ? "none" : "2px solid #EAC0CC",
            background: reminder.completed ? "#F0D020" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
          {reminder.completed && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1C0C16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Emoji */}
        <span style={{ fontSize: 18, flexShrink: 0 }}>{catInfo.emoji}</span>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1C0C16",
            textDecoration: reminder.completed ? "line-through" : "none",
            textDecorationColor: "#C090A0",
            opacity: reminder.completed ? 0.4 : 1 }}>
            {reminder.title}
          </p>
          {due && !reminder.completed && (
            <span style={{ display: "inline-block", marginTop: 3, fontSize: 10, fontWeight: 700,
              color: due.overdue ? "#C04568" : "#8BA870",
              background: due.overdue ? "#FBE4EA" : "rgba(139,168,112,0.12)",
              borderRadius: 999, padding: "2px 8px" }}>
              {due.label}
            </span>
          )}
        </div>

        {/* Delete */}
        <button type="button" onClick={() => onDelete(reminder.id)}
          style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: "rgba(192,69,104,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#C04568" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function RemindersInner({ user }: { user: User }) {
  const name = displayName(user);
  const [reminders, setReminders] = useState<HouseReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<ReminderCatKey>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("house_reminders").select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    setReminders((data as HouseReminder[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(title: string, cat: Exclude<ReminderCatKey,"all">, due: string | null) {
    await supabase.from("house_reminders").insert({ title, category: cat, due_date: due, created_by: name });
    await supabase.from("notifications").insert({
      actor_name: name, actor_email: user.email,
      action: "reminder_added", subject: title,
      message: `${name} added a reminder: "${title}"`,
      read_by: [user.email],
    });
    await load();
    setShowAdd(false);
  }

  async function handleComplete(id: string, done: boolean) {
    await supabase.from("house_reminders").update({ completed: done }).eq("id", id);
    await load();
  }

  async function handleDelete(id: string) {
    await supabase.from("house_reminders").delete().eq("id", id);
    await load();
  }

  const filtered = activeCat === "all" ? reminders : reminders.filter(r => r.category === activeCat);
  const active = filtered.filter(r => !r.completed);
  const completed = filtered.filter(r => r.completed);
  const totalActive = reminders.filter(r => !r.completed).length;

  return (
    <div style={{ background: "#F7C5D0", minHeight: "100vh", paddingBottom: 120 }}>

      {/* ── Header ── */}
      <div style={{
        background: "#E8849A",
        borderRadius: "0 0 40px 40px",
        paddingTop: "calc(env(safe-area-inset-top) + 12px)",
        paddingBottom: 28,
        paddingLeft: 22,
        paddingRight: 22,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FFFBE8", opacity: 0.7, marginBottom: 5 }}>
              Home Base
            </p>
            <h1 style={{ fontSize: 38, fontWeight: 900, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.02em" }}>Reminders</h1>
          </div>
          <NotificationBell userEmail={user.email!} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.25)", borderRadius: 999, padding: "11px 15px" }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>{totalActive}</p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#FFFBE8", opacity: 0.85, marginTop: 2 }}>open reminders</p>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.25)", borderRadius: 999, padding: "11px 15px" }}>
            <p style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>
              {reminders.filter(r => r.due_date && new Date(r.due_date + "T00:00:00") < new Date() && !r.completed).length}
            </p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#FFFBE8", opacity: 0.85, marginTop: 2 }}>overdue</p>
          </div>
        </div>
      </div>

      {/* ── Category pills ── */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "18px 16px 0", scrollbarWidth: "none" }}>
        {REMINDER_CATS.map(c => {
          const isActive = activeCat === c.key;
          const count = c.key === "all"
            ? reminders.filter(r => !r.completed).length
            : reminders.filter(r => r.category === c.key && !r.completed).length;
          return (
            <button key={c.key} type="button" onClick={() => setActiveCat(c.key)}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 999, border: "none", cursor: "pointer",
                background: isActive ? "#E8849A" : "rgba(255,255,255,0.7)",
                color: isActive ? "#FFFFFF" : "#C04568", fontSize: 13, fontWeight: 700, transition: "all 0.15s" }}>
              <span>{c.emoji}</span>
              <span>{c.label}</span>
              {count > 0 && (
                <span style={{ background: isActive ? "rgba(255,255,255,0.25)" : "rgba(192,69,104,0.12)", borderRadius: 999, padding: "1px 6px", fontSize: 10 }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div style={{ padding: "16px 16px 0" }}>
        {loading ? (
          <p style={{ textAlign: "center", padding: "40px 0", color: "#C04568", fontSize: 14 }}>Loading…</p>
        ) : active.length === 0 && completed.length === 0 ? (
          <div style={{ background: "#FFFFFF", borderRadius: 24, padding: "36px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 10 }}>✅</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1C0C16" }}>No reminders here</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#C04568", opacity: 0.6, marginTop: 4 }}>Tap + to add one.</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div style={{ background: "#FFFFFF", borderRadius: 24, overflow: "hidden", marginBottom: 16 }}>
                {active.map((r, i) => (
                  <ReminderRow key={r.id} reminder={r} onComplete={handleComplete} onDelete={handleDelete} showDivider={i > 0} />
                ))}
              </div>
            )}

            {completed.length > 0 && (
              <div>
                <button type="button" onClick={() => setShowCompleted(s => !s)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", paddingLeft: 4, marginBottom: 10 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C04568" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transform: showCompleted ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C04568", opacity: 0.5 }}>
                    Completed ({completed.length})
                  </span>
                </button>
                {showCompleted && (
                  <div style={{ background: "#FFFFFF", borderRadius: 24, overflow: "hidden" }}>
                    {completed.map((r, i) => (
                      <ReminderRow key={r.id} reminder={r} onComplete={handleComplete} onDelete={handleDelete} showDivider={i > 0} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── FAB ── */}
      <button type="button" onClick={() => setShowAdd(true)}
        style={{ position: "fixed", bottom: "calc(84px + env(safe-area-inset-bottom))", right: 20, width: 56, height: 56, borderRadius: "50%", background: "#E8849A", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(232,132,154,0.5)", zIndex: 40 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {showAdd && <AddReminderSheet onClose={() => setShowAdd(false)} onSave={handleAdd} />}
    </div>
  );
}

export default function RemindersPage() {
  return (
    <>
      <AuthGuard>{(user) => <RemindersInner user={user} />}</AuthGuard>
      <BottomNav />
    </>
  );
}
