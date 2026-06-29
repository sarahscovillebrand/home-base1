"use client";

import { useState } from "react";

type Props = {
  billName: string;
  monthLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ billName, monthLabel, onConfirm, onCancel }: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-gray-900">
          Are you sure you&apos;ve paid {billName} for {monthLabel}?
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Yes, I&apos;m sure I&apos;ve paid
        </label>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-pill border border-gray-200 py-2 text-sm font-medium text-gray-600"
          >
            Cancel
          </button>
          <button
            disabled={!checked}
            onClick={onConfirm}
            className="flex-1 rounded-pill bg-paid-text py-2 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: checked ? "#15803D" : "#9CA3AF" }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
