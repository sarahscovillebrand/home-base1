-- Home Base — Dashboard MVP schema
-- Run this whole file once in the Supabase SQL Editor (Project > SQL Editor > New query).

create table if not exists settings (
  id int primary key default 1,
  checking_balance numeric not null default 1842,
  buffer_goal numeric not null default 2000,
  hunter_paycheck numeric not null default 2435.07,
  current_paycheck_letter text not null default 'B' check (current_paycheck_letter in ('A','B')),
  home_base_committed numeric not null default 2889.17,
  operations_committed numeric not null default 2442.31,
  monthly_obligations_total numeric not null default 5331.47,
  sarah_goal numeric not null default 250,
  sarah_stretch_goal numeric not null default 400,
  lump_amount numeric not null default 2000,
  new_cc_debt boolean not null default false,
  all_minimums_covered boolean not null default true,
  constraint single_row check (id = 1)
);

insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  due_day int not null,
  paycheck_letter text not null check (paycheck_letter in ('A','B')),
  tappable boolean not null default false,
  sort_order int not null default 0
);

insert into bills (name, amount, due_day, paycheck_letter, tappable, sort_order)
select * from (values
  ('Rent', 2000, 1, 'A', true, 1),
  ('Utilities', 375, 15, 'B', true, 2),
  ('Car Payment', 450, 15, 'B', true, 3),
  ('Discover', 231.14, 20, 'B', true, 4)
) as v(name, amount, due_day, paycheck_letter, tappable, sort_order)
where not exists (select 1 from bills);

-- Paid status resets each pay period. period_label looks like '2026-07-09'.
create table if not exists bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills(id) on delete cascade,
  period_label text not null,
  paid boolean not null default false,
  paid_at timestamptz,
  unique (bill_id, period_label)
);

-- Sarah's per-paycheck freelance income log (Mindful Mother)
create table if not exists income_log (
  id uuid primary key default gen_random_uuid(),
  paycheck_date date not null unique,
  source1_name text,
  source1_amount numeric not null default 0,
  source2_name text,
  source2_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

insert into income_log (paycheck_date, source1_name, source1_amount, source2_name, source2_amount)
select * from (values
  ('2026-06-25'::date, 'Website client', 120, 'UGC', 60)
) as v(paycheck_date, source1_name, source1_amount, source2_name, source2_amount)
where not exists (select 1 from income_log);

-- Row Level Security: open read/write for now since this is a private 2-person app
-- with no login screen yet. Tighten this later if you add auth.
alter table settings enable row level security;
alter table bills enable row level security;
alter table bill_payments enable row level security;
alter table income_log enable row level security;

create policy "allow all settings" on settings for all using (true) with check (true);
create policy "allow all bills" on bills for all using (true) with check (true);
create policy "allow all bill_payments" on bill_payments for all using (true) with check (true);
create policy "allow all income_log" on income_log for all using (true) with check (true);
