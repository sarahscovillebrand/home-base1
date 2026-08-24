"use client";

import { useRef, useState } from "react";
import { Bill } from "@/lib/types";
import { formatMoney } from "@/lib/calc";
import ConfirmModal from "./ConfirmModal";

type Props = {
  bill: Bill;
  paid: boolean;
  monthLabel: string;
  onTogglePaid: (billId: string, nextPaid: boolean, amount?: number) => Promise<void>;
  onDelete: (billId: string) => Promise<void>;
};

const REVEAL_WIDTH = 80;
const SWIPE_THRESHOLD = 50;

export default function BillPill({ bill, paid, monthLabel, onTogglePaid, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const isSwiping = useRef(false);

  async function handleConfirm(amount: number) {
    setSaving(true);
    await onTogglePaid(bill.id, true, amount);
    setSaving(false);
    setShowModal(false);
  }

  function handleClick() {
    if (isSwiping.current) return;
    if (swipeX < 0) {
      setSwipeX(0);
      return;
    }
    if (!bill.tappable) return;
    if (paid) {
      onTogglePaid(bill.id, false);
      return;
    }
    setShowModal(true);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < -8) {
      isSwiping.current = true;
      setSwipeX(Math.max(dx, -(REVEAL_WIDTH + 20)));
    }
  }

  function onTouchEnd() {
    if (swipeX < -SWIPE_THRESHOLD) {
      setSwipeX(-REVEAL_WIDTH);
    } else {
      setSwipeX(0);
    }
    touchStartX.current = null;
    // keep isSwiping true briefly so click doesn't fire
    setTimeout(() => { isSwiping.current = false; }, 50);
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(bill.id);
  }

  const rowBg = bill.tappable
    ? paid
      ? "rgba(255,255,255,0.85)"
      : "rgba(255,255,255,0.55)"
    : "rgba(255,255,255,0.35)";

  const isRevealed = swipeX <= -REVEAL_WIDTH + 5;

  return (
    <>
      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden" }}>
        {/* Delete button behind the row */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: REVEAL_WIDTH,
          background: "#DC2626",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 18,
        }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: "none", border: "none", color: "#fff",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              opacity: deleting ? 0.5 : isRevealed ? 1 : 0,
              transition: "opacity 0.15s",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
            Delete
          </button>
        </div>

        {/* Main row */}
        <div
          onClick={handleClick}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: rowBg,
            borderRadius: 18,
            padding: "15px 18px",
            cursor: bill.tappable ? "pointer" : "default",
            opacity: saving || deleting ? 0.6 : 1,
            transform: `translateX(${swipeX}px)`,
            transition: touchStartX.current === null ? "transform 0.22s ease" : "none",
            position: "relative",
            zIndex: 1,
            willChange: "transform",
          }}
        >
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

          {bill.tappable ? (
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: paid ? "rgba(80,64,160,0.75)" : "rgba(80,64,160,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
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
              fontSize: 9, fontWeight: 700, letterSpacing: "0.07em",
              textTransform: "uppercase", color: "#302070", opacity: 0.35, flexShrink: 0,
            }}>
              autopay
            </span>
          )}
        </div>
      </div>

      {showModal && (
        <ConfirmModal
          billName={bill.name}
          amount={bill.amount}
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
