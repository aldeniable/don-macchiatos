-- Cash deposits: the physical cash a branch hands over to the owner's bank
-- account, logged so the amounts on the slips can be read against the cash the
-- daily entries say should exist.
--
-- A deposit is a transfer between two places the owner already owns, not a
-- cost, so it deliberately lives outside expense_entries: booking it as an
-- expense would eat into every net figure in the reports.
-- Run in the Supabase SQL editor, or via `supabase db push`.

-- Deliberately no unique key on (branch_id, deposit_date): two branches deposit
-- on the same day and a branch can split a day into more than one slip, so rows
-- need their own identity and their own insert/update/delete rather than the
-- delete-then-insert a day's sales and expenses use.
create table if not exists public.cash_deposits (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  deposit_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  -- The bank slip or transfer number, which is what makes a row findable on a
  -- bank statement.
  reference text,
  note text,
  -- Nobody verifies a deposit after it is entered, so who typed it is the only
  -- accountability there is. The name is stored alongside the id because
  -- row level security on profiles hides other people's names from an admin.
  recorded_by uuid references public.profiles(id),
  recorded_by_name text not null default '',
  updated_by uuid references public.profiles(id),
  updated_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_deposits_branch_date_idx
  on public.cash_deposits (branch_id, deposit_date);

-- Entering the same slip twice is the likeliest way this log goes wrong.
create unique index if not exists cash_deposits_branch_reference_key
  on public.cash_deposits (branch_id, lower(reference))
  where reference is not null;

-- Cash movement per day for a branch, with the balance carried in from every
-- earlier day, so `on_hand` is what should be sitting in the drawer at the end
-- of that date. Built like public.stock_day_state: there is no stored total, so
-- nothing can drift.
create or replace function public.cash_day_state(
  p_branch_id uuid,
  p_start date,
  p_end date
)
returns table (
  entry_date date,
  cash_sales numeric,
  cash_expenses numeric,
  deposited numeric,
  on_hand numeric
)
language sql
stable
as $$
  with daily as (
    select
      movement.entry_date,
      sum(movement.cash_sales) as cash_sales,
      sum(movement.cash_expenses) as cash_expenses,
      sum(movement.deposited) as deposited
    from (
      select
        s.entry_date,
        s.cash_quantity * s.unit_price_snapshot as cash_sales,
        0::numeric as cash_expenses,
        0::numeric as deposited
      from public.sales_entries s
      where s.branch_id = p_branch_id
        and s.entry_date <= p_end
      union all
      select e.entry_date, 0::numeric, e.cash_amount, 0::numeric
      from public.expense_entries e
      where e.branch_id = p_branch_id
        and e.entry_date <= p_end
      union all
      select c.deposit_date, 0::numeric, 0::numeric, c.amount
      from public.cash_deposits c
      where c.branch_id = p_branch_id
        and c.deposit_date <= p_end
    ) movement
    group by movement.entry_date
  ),
  -- The running balance has to be worked out over every day up to p_end before
  -- the range is narrowed, otherwise the first row in the window would start
  -- from zero instead of carrying the opening balance in.
  running as (
    select
      daily.entry_date,
      daily.cash_sales,
      daily.cash_expenses,
      daily.deposited,
      sum(daily.cash_sales - daily.cash_expenses - daily.deposited)
        over (order by daily.entry_date) as on_hand
    from daily
  )
  select
    running.entry_date,
    running.cash_sales,
    running.cash_expenses,
    running.deposited,
    running.on_hand
  from running
  where running.entry_date >= p_start
  order by running.entry_date;
$$;

-- All-time cash position per branch as of p_through, for the branch home card
-- and the owner's cross-branch rollup. Passing p_branch_id narrows it to one
-- branch; leaving it null returns every branch the caller may read.
create or replace function public.cash_position(
  p_through date,
  p_branch_id uuid default null
)
returns table (
  branch_id uuid,
  cash_sales numeric,
  cash_expenses numeric,
  deposited numeric,
  on_hand numeric,
  last_deposit_date date,
  last_deposit_amount numeric
)
language sql
stable
as $$
  select
    br.id,
    coalesce(sales.total, 0),
    coalesce(expenses.total, 0),
    coalesce(deposits.total, 0),
    coalesce(sales.total, 0) - coalesce(expenses.total, 0) - coalesce(deposits.total, 0),
    deposits.last_date,
    deposits.last_amount
  from public.branches br
  left join lateral (
    select sum(s.cash_quantity * s.unit_price_snapshot) as total
    from public.sales_entries s
    where s.branch_id = br.id
      and s.entry_date <= p_through
  ) sales on true
  left join lateral (
    select sum(e.cash_amount) as total
    from public.expense_entries e
    where e.branch_id = br.id
      and e.entry_date <= p_through
  ) expenses on true
  left join lateral (
    select
      sum(c.amount) as total,
      max(c.deposit_date) as last_date,
      (array_agg(c.amount order by c.deposit_date desc, c.created_at desc))[1] as last_amount
    from public.cash_deposits c
    where c.branch_id = br.id
      and c.deposit_date <= p_through
  ) deposits on true
  where p_branch_id is null or br.id = p_branch_id;
$$;

alter table public.cash_deposits enable row level security;

drop policy if exists cash_deposits_select on public.cash_deposits;
create policy cash_deposits_select on public.cash_deposits
  for select using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );

-- Staff walk the cash to the bank, so writes are branch-wide rather than
-- admin-only, the same as a day's sales.
drop policy if exists cash_deposits_write on public.cash_deposits;
create policy cash_deposits_write on public.cash_deposits
  for all using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  )
  with check (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );
