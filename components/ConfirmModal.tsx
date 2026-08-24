"use client";

import { useState } from "react";

type Props = {
  billName: string;
  amount: number;
  monthLabel: string;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
};

export default function ConfirmModal({ billName, amount, monthLabel, onConfirm, onCancel }: Props) {
  const [editAmount, setEditAmount] = useState(amount.toFixed(2));

  function handleConfirm() {
    const parsed = parseFloat(editAmount);
    onConfirm(isNaN(parsed) || parsed <= 0 ? amount : parsed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 28,
          padding: "28px 24px",
          width: "100%",
          maxWidth: 340,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xl font-extrabold" style={{ color: "#1E1830" }}>
          Confirm payment
        </p>
        <p className="mt-2 text-sm font-semibold" style={{ color: "#8070C0" }}>
          Mark <span style={{ color: "#5040A0" }}>{billName}</span> as paid for {monthLabel}?
        </p>

        {/* Editable amount */}
        <div style={{ marginTop: 20 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: "#8070C0",
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
          }}>
            Amount paid
          </p>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
              fontSize: 18, fontWeight: 800, color: "#5040A0", pointerEvents: "none",
            }}>
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              style={{
                width: "100%",
                background: "#F0EFF8",
                border: "2px solid transparent",
                borderRadius: 16,
                padding: "14px 16px 14px 32px",
                fontSize: 22,
                fontWeight: 800,
                color: "#1E1830",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = "#C8C0E8")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              background: "#F0EFF8",
              color: "#8070C0",
              border: "none",
              borderRadius: 999,
              padding: "14px 0",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              flex: 1,
              background: "#5040A0",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 999,
              padding: "14px 0",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
