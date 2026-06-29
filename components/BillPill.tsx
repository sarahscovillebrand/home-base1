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
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        className="flex items-center justify-between gap-3 rounded-pill px-4 py-3 text-left transition-colors"
        style={{
          background: paid ? "#D5F2E3" : "#DCEAFE",
          color: paid ? "#15803D" : "#1D4ED8",
        }}
      >
        <span className="font-medium">{bill.name}</span>
        <span className="text-sm opacity-80">
          {formatMoney(bill.amount)} · due {ordinal(bill.due_day)}
        </span>
      </button>
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
