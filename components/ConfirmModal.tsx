"use client";

type Props = {
  billName: string;
  monthLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ billName, monthLabel, onConfirm, onCancel }: Props) {
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
            onClick={onConfirm}
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
