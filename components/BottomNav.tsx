"use client";

import { useState } from "react";

type Tab = "home" | "budget" | "bills" | "goals" | "more";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "home",   label: "Home",   icon: "🏡" },
  { id: "budget", label: "Budget", icon: "💰" },
  { id: "bills",  label: "Bills",  icon: "📋" },
  { id: "goals",  label: "Goals",  icon: "🎯" },
  { id: "more",   label: "More",   icon: "•••" },
];

export default function BottomNav() {
  const [active, setActive] = useState<Tab>("home");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around"
      style={{
        background: "#FFFFFF",
        borderRadius: "24px 24px 0 0",
        padding: "10px 6px 28px",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.06)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className="flex flex-col items-center gap-1"
            style={{ minWidth: 56 }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 48,
                height: 34,
                borderRadius: 12,
                background: isActive ? "#EDE8F8" : "transparent",
                fontSize: tab.id === "more" ? 11 : 18,
                fontWeight: tab.id === "more" ? 800 : undefined,
                color: isActive ? "#5040A0" : "#B0A8C8",
                transition: "background 0.15s",
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: isActive ? "#5040A0" : "#B0A8C8",
                letterSpacing: "0.02em",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
