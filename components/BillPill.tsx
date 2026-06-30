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
    if (paid) {
      // Tapping a paid pill un-marks it immediately (undo a mistake) without
      // the confirmation step — only marking-as-paid needs the safety check.
      onTogglePaid(bill.id, false);
      return;
    }
    setShowModal(true);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          className="flex flex-1 items-center justify-between gap-3 rounded-pill px-4 py-3"
          style={{
            background: paid ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.5)",
            color: "#1A1040",
          }}
        >
          <span className="font-bold text-sm">{bill.name}</span>
          <span className="text-xs font-semibold" style={{ opacity: 0.55 }}>
            {formatMoney(bill.amount)} · due {ordinal(bill.due_day)}
          </span>
        </div>
        {bill.pay_url && (
          <a
            href={bill.pay_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Go pay ${bill.name}`}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-opacity hover:opacity-70"
            style={{ background: "rgba(255,255,255,0.6)", color: "#5040A0" }}
          >
            ↗
          </a>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={saving}
          aria-label={paid ? `Mark ${bill.name} unpaid` : `Mark ${bill.name} paid`}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
          style={{
            background: paid ? "rgba(80,64,160,0.7)" : "rgba(255,255,255,0.6)",
            color: paid ? "#FFFFFF" : "#8070C0",
          }}
        >
          {paid ? "✓" : "○"}
        </button>
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
  const j = day % 10,
    k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}
