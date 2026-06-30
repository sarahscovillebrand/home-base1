"use client";

import { useState } from "react";
import { Bill } from "@/lib/types";
import { formatMoney } from "@/lib/calc";
import ConfirmModal from "./ConfirmModal";

type Props = {
  bill: Bill;
  paid: boolean;
  monthLabel: string;
  onTogglePaid: (billId: string, nextPaid: boolean) => Promise<void>;
};

export default function BillPill({ bill, paid, monthLabel, onTogglePaid }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    await onTogglePaid(bill.id, true);
    setSaving(false);
    setShowModal(false);
  }

  function handleClick() {
    if (!bill.tappable) return;
    if (paid) {
      onTogglePaid(bill.id, false);
      return;
    }
    setShowModal(true);
  }

  const rowBg = bill.tappable
    ? paid
      ? "rgba(255,255,255,0.85)"
      : "rgba(255,255,255,0.55)"
    : "rgba(255,255,255,0.35)";

  return (
    <>
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          background: rowBg,
          borderRadius: 18,
          padding: "15px 18px",
          cursor: bill.tappable ? "pointer" : "default",
          opacity: saving ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {/* Left: name + amount */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#1A1040",
            textDecoration: paid ? "line-through" : "none",
            textDecorationColor: "rgba(80,64,160,0.4)",
            opacity: paid ? 0.6 : 1,
          }}>
            {bill.name}
          </p>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#302070", opacity: 0.5, marginTop: 2 }}>
            {formatMoney(bill.amount)} · due {ordinal(bill.due_day)}
          </p>
        </div>

        {/* Right: check circle or autopay tag */}
        {bill.tappable ? (
          <div style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            flexShrink: 0,
            background: paid ? "rgba(80,64,160,0.75)" : "rgba(80,64,160,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.18s",
          }}>
            {paid ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#8070C0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </div>
        ) : (
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#302070",
            opacity: 0.35,
            flexShrink: 0,
          }}>
            autopay
          </span>
        )}
      </div>

      {showModal && (
        <ConfirmModal
          billName={bill.name}
          monthLabel={monthLabel}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function ordinal(day: number): string {
  if (day === 0) return "every payday";
  const j = day % 10, k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}
