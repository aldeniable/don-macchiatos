-- Stocks: per-business stock catalog plus daily add/use movements per branch.
-- Run in the Supabase SQL editor, or via `supabase db push`.

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists stock_items_business_name_key
  on public.stock_items (business_id, lower(name));

-- One row per branch / item / day. Quantities are whole counted units, so the
-- columns are integers. The running balance is the sum of every movement up to
-- and including a date, so there is no stored total to drift.
create table if not exists public.stock_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id),
  entry_date date not null,
  added_quantity integer not null default 0 check (added_quantity >= 0),
  used_quantity integer not null default 0 check (used_quantity >= 0),
  recorded_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (branch_id, entry_date, stock_item_id)
);

create index if not exists stock_entries_balance_idx
  on public.stock_entries (branch_id, stock_item_id, entry_date);

-- Every stock item for a branch's business, with the quantity carried in from
-- previous days, what was added/used on p_entry_date, and the resulting balance.
create or replace function public.stock_day_state(
  p_branch_id uuid,
  p_entry_date date
)
returns table (
  stock_item_id uuid,
  item_name text,
  is_active boolean,
  sort_order int,
  opening_quantity bigint,
  added_quantity bigint,
  used_quantity bigint,
  closing_quantity bigint
)
language sql
stable
as $$
  select
    si.id,
    si.name,
    si.is_active,
    si.sort_order,
    (coalesce(prior.added, 0) - coalesce(prior.used, 0))::bigint,
    coalesce(today.added_quantity, 0)::bigint,
    coalesce(today.used_quantity, 0)::bigint,
    (coalesce(prior.added, 0) - coalesce(prior.used, 0)
      + coalesce(today.added_quantity, 0)
      - coalesce(today.used_quantity, 0))::bigint
  from public.branches br
  join public.stock_items si on si.business_id = br.business_id
  left join lateral (
    select
      sum(e.added_quantity) as added,
      sum(e.used_quantity) as used
    from public.stock_entries e
    where e.branch_id = br.id
      and e.stock_item_id = si.id
      and e.entry_date < p_entry_date
  ) prior on true
  left join public.stock_entries today
    on today.branch_id = br.id
    and today.stock_item_id = si.id
    and today.entry_date = p_entry_date
  where br.id = p_branch_id
  order by si.sort_order, si.name;
$$;

alter table public.stock_items enable row level security;
alter table public.stock_entries enable row level security;

drop policy if exists stock_items_select on public.stock_items;
create policy stock_items_select on public.stock_items
  for select using (
    public.current_role() = 'superadmin'
    or business_id = public.current_business_id()
  );

drop policy if exists stock_items_write on public.stock_items;
create policy stock_items_write on public.stock_items
  for all using (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and business_id = public.current_business_id())
  )
  with check (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and business_id = public.current_business_id())
  );

drop policy if exists stock_entries_select on public.stock_entries;
create policy stock_entries_select on public.stock_entries
  for select using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );

drop policy if exists stock_entries_write on public.stock_entries;
create policy stock_entries_write on public.stock_entries
  for all using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  )
  with check (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );
