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
    <div className="card mt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">This paycheck</p>
          <p className="text-lg font-semibold" style={{ color: "#5B53D6" }}>
            Paycheck {letter} · {label}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Left after bills</p>
          <p
            className="text-lg font-semibold"
            style={{ color: leftAfterBills(settings) < 0 ? "#B91C1C" : "#7C8A1E" }}
          >
            {formatMoney(leftAfterBills(settings))}
          </p>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-400">
        Committed: {formatMoney(committedThisPaycheck(settings))} of {formatMoney(settings.hunter_paycheck)}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {tappable.length === 0 ? (
          <p className="text-sm text-gray-400">No tap-to-confirm bills on this paycheck.</p>
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
      <p className="mt-3 text-xs text-gray-400">
        Everything else (insurance, internet, subscriptions, and every card except Discover) autopays — nothing to tap.
      </p>
    </div>
  );
}
