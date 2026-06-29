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
            background: paid ? "#EAF2C2" : "#EDEBFB",
            color: paid ? "#7C8A1E" : "#5B53D6",
          }}
        >
          <span className="font-medium">{bill.name}</span>
          <span className="text-sm opacity-80">
            {formatMoney(bill.amount)} · due {ordinal(bill.due_day)}
          </span>
        </div>
        {bill.pay_url && (
          <a
            href={bill.pay_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Go pay ${bill.name}`}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border text-base"
            style={{ borderColor: "#DEF453", color: "#5B53D6" }}
          >
            ↗
          </a>
        )}
        <button
          type="button"
          onClick={handleClick}
          disabled={saving}
          aria-label={paid ? `Mark ${bill.name} unpaid` : `Mark ${bill.name} paid`}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border text-base transition-colors"
          style={{
            borderColor: "#DEF453",
            background: paid ? "#7C8A1E" : "#FFFFFF",
            color: paid ? "#FFFFFF" : "#9D96EE",
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
