export type Settings = {
  id: number;
  checking_balance: number;
  buffer_goal: number;
  hunter_paycheck: number;
  current_paycheck_letter: "A" | "B";
  home_base_committed: number;
  operations_committed: number;
  monthly_obligations_total: number;
  sarah_goal: number;
  sarah_stretch_goal: number;
  lump_amount: number;
  new_cc_debt: boolean;
  all_minimums_covered: boolean;
};

export type Bill = {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  paycheck_letter: "A" | "B";
  tappable: boolean;
  sort_order: number;
  pay_url: string | null;
};

export type BillPayment = {
  id: string;
  bill_id: string;
  period_label: string;
  paid: boolean;
  paid_at: string | null;
};

export type IncomeLogRow = {
  id: string;
  paycheck_date: string;
  source1_name: string | null;
  source1_amount: number;
  source2_name: string | null;
  source2_amount: number;
};

export type HousekeepingTask = {
  id: string;
  name: string;
  duration: string | null;
  day_of_week: number;
  week_number: number;
  assigned_to: "sarah" | "hunter" | "shared";
  sort_order: number;
  active: boolean;
};

export type HousekeepingCompletion = {
  id: string;
  task_id: string;
  completed_by_name: string;
  completed_by_email: string;
  completed_at: string;
  task_date: string;
};
