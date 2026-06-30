"use client";

import { Bill, BillPayment, Settings } from "@/lib/types";
import { committedThisPaycheck, formatMoney, getCurrentPaycheckLetter, leftAfterBills } from "@/lib/calc";
import BillPill from "./BillPill";

type Props = {
  settings: Settings;
  bills: Bill[];
  payments: BillPayment[];
  monthLabel: string;
  onTogglePaid: (billId: string, nextPaid: boolean) => Promise<void>;
};

export default function PaycheckCard({ settings, bills, payments, monthLabel, onTogglePaid }: Props) {
  const letter = getCurrentPaycheckLetter();
  const label = letter === "A" ? "Home Base" : "Operations";
  const tappable = bills.filter((b) => b.tappable && b.paycheck_letter === letter);
  const paidMap = new Map(payments.map((p) => [p.bill_id, p.paid]));

  return (
    <div className="card" style={{ background: "#C8C0E8" }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#302070", opacity: 0.6 }}>
            This paycheck
          </p>
          <p className="mt-0.5 text-base font-extrabold" style={{ color: "#1A1040" }}>
            Paycheck {letter} · {label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#302070", opacity: 0.6 }}>
            Left after bills
          </p>
          <p
            className="num-display mt-0.5 text-xl"
            style={{ color: leftAfterBills(settings) < 0 ? "#B91C1C" : "#1A1040" }}
          >
            {formatMoney(leftAfterBills(settings))}
          </p>
        </div>
      </div>
      <p className="mt-1 text-xs font-semibold" style={{ color: "#302070", opacity: 0.5 }}>
        Committed: {formatMoney(committedThisPaycheck(settings))} of {formatMoney(settings.hunter_paycheck)}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {tappable.length === 0 ? (
          <p className="text-sm" style={{ color: "#302070", opacity: 0.5 }}>No tap-to-confirm bills on this paycheck.</p>
        ) : (
          tappable.map((bill) => (
            <BillPill
              key={bill.id}
              bill={bill}
              paid={paidMap.get(bill.id) ?? false}
              monthLabel={monthLabel}
              onTogglePaid={onTogglePaid}
            />
          ))
        )}
      </div>
      <p className="mt-3 text-xs font-semibold" style={{ color: "#302070", opacity: 0.4 }}>
        Internet, Amazon Prime, Apple Storage, Business Software, and Renter&apos;s Insurance autopay — already counted in the committed total above.
      </p>
    </div>
  );
}
