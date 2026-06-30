"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Notif = {
  id: string;
  created_at: string;
  actor_name: string;
  action: string;
  subject: string;
  message: string;
  read_by: string[];
};

export default function NotificationBell({ userEmail }: { userEmail: string }) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifs(data ?? []);
  }

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unread = notifs.filter((n) => !n.read_by.includes(userEmail));

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && unread.length > 0) {
      // Mark all as read for this user
      const ids = unread.map((n) => n.id);
      for (const id of ids) {
        const notif = notifs.find((n) => n.id === id)!;
        await supabase
          .from("notifications")
          .update({ read_by: [...notif.read_by, userEmail] })
          .eq("id", id);
      }
      // Optimistically update local state
      setNotifs((prev) =>
        prev.map((n) =>
          ids.includes(n.id) ? { ...n, read_by: [...n.read_by, userEmail] } : n
        )
      );
    }
  }

  function timeAgo(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: "#FFFFFF", border: "0.5px solid #EBEBEB" }}
      >
        🔔
        {unread.length > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
            style={{ background: "#E86060", fontSize: 9 }}
          >
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-72 rounded-2xl overflow-hidden"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "#9090A8" }}>
              Notifications
            </p>
          </div>

          {notifs.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold" style={{ color: "#C8C4D8" }}>
                Nothing yet
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifs.map((n) => {
                const isUnread = !n.read_by.includes(userEmail);
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3"
                    style={{
                      background: isUnread ? "#F5F3FF" : "#FFFFFF",
                      borderBottom: "1px solid #F5F5F5",
                    }}
                  >
                    <span className="mt-0.5 text-base">
                      {n.action === "marked_paid" ? "✅"
                        : n.action === "marked_unpaid" ? "↩️"
                        : n.action === "task_done" ? "🧹"
                        : n.action === "task_unchecked" ? "↩️"
                        : "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug" style={{ color: "#1E1830" }}>
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold" style={{ color: "#B0A8C8" }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {isUnread && (
                      <div
                        className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: "#8070C0" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
