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

function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function actionIcon(action: string) {
  if (action === "task_done") return (
    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
  if (action === "task_unchecked" || action === "marked_unpaid") return (
    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E65100" strokeWidth="3" strokeLinecap="round">
        <path d="M9 14l-4-4 4-4" />
        <path d="M5 10h11a4 4 0 010 8h-1" />
      </svg>
    </div>
  );
  if (action === "marked_paid") return (
    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E8EAF6", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3949AB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
  return (
    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F3E5F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <BellIcon size={11} />
    </div>
  );
}

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

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

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
      const ids = unread.map((n) => n.id);
      for (const id of ids) {
        const notif = notifs.find((n) => n.id === id)!;
        await supabase
          .from("notifications")
          .update({ read_by: [...notif.read_by, userEmail] })
          .eq("id", id);
      }
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
        style={{ background: "#FFFFFF", border: "0.5px solid #EBEBEB", color: "#8070C0" }}
      >
        <BellIcon size={18} />
        {unread.length > 0 && (
          <span
            className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-white"
            style={{ background: "#E86060", fontSize: 9, fontWeight: 800 }}
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
              <p className="text-sm font-semibold" style={{ color: "#C8C4D8" }}>Nothing yet</p>
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
                    <div className="mt-0.5 flex-shrink-0">{actionIcon(n.action)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug" style={{ color: "#1E1830" }}>
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold" style={{ color: "#B0A8C8" }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {isUnread && (
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: "#8070C0" }} />
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
