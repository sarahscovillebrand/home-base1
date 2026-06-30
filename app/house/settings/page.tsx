"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { AuthGuard } from "@/components/AuthGuard";
import { HousekeepingTask } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ASSIGNED_OPTIONS: { value: "shared" | "sarah" | "hunter"; label: string; color: string }[] = [
  { value: "shared", label: "Shared", color: "#B0A8C8" },
  { value: "sarah",  label: "Sarah",  color: "#E86090" },
  { value: "hunter", label: "Hunter", color: "#5040A0" },
];

function AssignButton({
  current,
  value,
  label,
  color,
  onChange,
}: {
  current: "shared" | "sarah" | "hunter";
  value: "shared" | "sarah" | "hunter";
  label: string;
  color: string;
  onChange: (v: "shared" | "sarah" | "hunter") => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      style={{
        padding: "4px 12px",
        borderRadius: 10,
        border: "none",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        background: active ? color : "rgba(0,0,0,0.06)",
        color: active ? "#fff" : "#888",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function TaskSettingsInner({ user: _user }: { user: User }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [activeWeek, setActiveWeek] = useState(1);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("housekeeping_tasks")
      .select("*")
      .eq("active", true)
      .order("week_number")
      .order("day_of_week")
      .order("sort_order");
    setTasks((data as HousekeepingTask[]) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAssign(
    taskId: string,
    value: "shared" | "sarah" | "hunter"
  ) {
    setSaving((s) => new Set(s).add(taskId));
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, assigned_to: value } : t))
    );
    await supabase
      .from("housekeeping_tasks")
      .update({ assigned_to: value })
      .eq("id", taskId);
    setSaving((s) => {
      const next = new Set(s);
      next.delete(taskId);
      return next;
    });
  }

  const weekTasks = tasks.filter((t) => t.week_number === activeWeek);

  // Group by day_of_week
  const byDay: Record<number, HousekeepingTask[]> = {};
  for (let d = 0; d < 7; d++) byDay[d] = [];
  weekTasks.forEach((t) => byDay[t.day_of_week].push(t));

  return (
    <div className="min-h-screen" style={{ background: "#F7F7F7" }}>
      {/* Header */}
      <div
        style={{
          background: "#C8C0E8",
          padding: "52px 24px 24px",
          borderRadius: "0 0 28px 28px",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/house")}
            style={{
              background: "rgba(255,255,255,0.5)",
              border: "none",
              borderRadius: 12,
              width: 36,
              height: 36,
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ←
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#302070", opacity: 0.6 }}>
              Housekeeping
            </p>
            <h1 className="wordmark text-xl" style={{ color: "#1A1040" }}>
              Task Assignments
            </h1>
          </div>
        </div>

        {/* Week picker */}
        <div className="flex gap-2 mt-4">
          {[1, 2, 3, 4].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setActiveWeek(w)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 12,
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                background: activeWeek === w ? "#5040A0" : "rgba(255,255,255,0.4)",
                color: activeWeek === w ? "#fff" : "#5040A0",
                transition: "all 0.15s",
              }}
            >
              Week {w}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-6 pt-5 pb-1 text-xs font-bold" style={{ color: "#888" }}>
        <span style={{ color: "#B0A8C8" }}>● Shared</span>
        <span style={{ color: "#E86090" }}>● Sarah</span>
        <span style={{ color: "#5040A0" }}>● Hunter</span>
      </div>

      {/* Days */}
      <div className="px-4 pb-12 flex flex-col gap-4 mt-3">
        {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
          const dayTasks = byDay[dow];
          if (dayTasks.length === 0) return null;
          return (
            <div key={dow}>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "#5040A0", opacity: 0.7 }}
              >
                {DAY_NAMES[dow]}
              </p>
              <div className="flex flex-col gap-2">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      background: "#fff",
                      borderRadius: 14,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                      opacity: saving.has(task.id) ? 0.6 : 1,
                      transition: "opacity 0.15s",
                    }}
                  >
                    {/* Color dot */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          task.assigned_to === "sarah"
                            ? "#E86090"
                            : task.assigned_to === "hunter"
                            ? "#5040A0"
                            : "#B0A8C8",
                        flexShrink: 0,
                      }}
                    />
                    {/* Task name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "#1E1830" }}>
                        {task.name}
                      </p>
                      {task.duration && (
                        <p className="text-xs" style={{ color: "#B0A8C8" }}>
                          {task.duration}
                        </p>
                      )}
                    </div>
                    {/* Assignment buttons */}
                    <div className="flex gap-1 shrink-0">
                      {ASSIGNED_OPTIONS.map((opt) => (
                        <AssignButton
                          key={opt.value}
                          current={task.assigned_to}
                          value={opt.value}
                          label={opt.label}
                          color={opt.color}
                          onChange={(v) => handleAssign(task.id, v)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HouseSettingsPage() {
  return <AuthGuard>{(user) => <TaskSettingsInner user={user} />}</AuthGuard>;
}
