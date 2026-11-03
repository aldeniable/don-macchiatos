-- One employee, several stores. A person who works both the Don Macchiatos and
-- the Don Lemon counter at the same site is one account with access to both,
-- rather than two logins, so the branch an account may enter moves off
-- profiles.branch_id into a list.
--
-- The role stays on the profile: an account is an admin everywhere it reaches
-- or a user everywhere it reaches, never one of each.
-- Run in the Supabase SQL editor, or via `supabase db push`.

create table if not exists public.profile_branches (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, branch_id)
);

create index if not exists profile_branches_branch_idx
  on public.profile_branches (branch_id);

insert into public.profile_branches (profile_id, branch_id)
select id, branch_id
from public.profiles
where branch_id is not null
on conflict do nothing;

-- The two checks every policy below is written in terms of. A superadmin
-- reaches everything; everyone else reaches the branches on their list, and the
-- businesses those branches belong to.
create or replace function public.can_access_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_role() = 'superadmin'
    or exists (
      select 1
      from public.profile_branches pb
      where pb.profile_id = auth.uid()
        and pb.branch_id = p_branch_id
    );
$$;

create or replace function public.can_access_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_role() = 'superadmin'
    or exists (
      select 1
      from public.profile_branches pb
      join public.branches b on b.id = pb.branch_id
      where pb.profile_id = auth.uid()
        and b.business_id = p_business_id
    );
$$;

-- An employee reads their own access list so the app can offer the store
-- picker. Changing it is the owner's call alone.
alter table public.profile_branches enable row level security;

drop policy if exists profile_branches_select on public.profile_branches;
create policy profile_branches_select on public.profile_branches
  for select using (
    public.current_role() = 'superadmin'
    or profile_id = auth.uid()
  );

drop policy if exists profile_branches_superadmin_write on public.profile_branches;
create policy profile_branches_superadmin_write on public.profile_branches
  for all using (public.current_role() = 'superadmin')
  with check (public.current_role() = 'superadmin');

-- Every policy that used to compare against the single branch or its business,
-- rewritten against the list. The rules themselves are unchanged.

drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select using (public.can_access_business(id));

drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select using (public.can_access_branch(id));

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (public.can_access_business(business_id));

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and public.can_access_business(business_id))
  )
  with check (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and public.can_access_business(business_id))
  );

drop policy if exists prices_select on public.branch_product_prices;
create policy prices_select on public.branch_product_prices
  for select using (public.can_access_branch(branch_id));

drop policy if exists prices_write on public.branch_product_prices;
create policy prices_write on public.branch_product_prices
  for all using (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and public.can_access_branch(branch_id))
  )
  with check (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and public.can_access_branch(branch_id))
  );

drop policy if exists expense_categories_select on public.expense_categories;
create policy expense_categories_select on public.expense_categories
  for select using (
    public.current_role() = 'superadmin'
    or (public.can_access_business(business_id) and not is_superadmin_only)
  );

drop policy if exists expense_categories_write on public.expense_categories;
create policy expense_categories_write on public.expense_categories
  for all using (
    public.current_role() = 'superadmin'
    or (
      public.current_role() = 'admin'
      and public.can_access_business(business_id)
      and not is_superadmin_only
    )
  )
  with check (
    public.current_role() = 'superadmin'
    or (
      public.current_role() = 'admin'
      and public.can_access_business(business_id)
      and not is_superadmin_only
    )
  );

drop policy if exists sales_select on public.sales_entries;
create policy sales_select on public.sales_entries
  for select using (public.can_access_branch(branch_id));

drop policy if exists sales_write on public.sales_entries;
create policy sales_write on public.sales_entries
  for all using (public.can_access_branch(branch_id))
  with check (public.can_access_branch(branch_id));

drop policy if exists expenses_select on public.expense_entries;
create policy expenses_select on public.expense_entries
  for select using (public.can_access_branch(branch_id));

drop policy if exists expenses_write on public.expense_entries;
create policy expenses_write on public.expense_entries
  for all using (
    public.current_role() = 'superadmin'
    or (
      public.can_access_branch(branch_id)
      and not public.expense_category_is_superadmin_only(category_id)
    )
  )
  with check (
    public.current_role() = 'superadmin'
    or (
      public.can_access_branch(branch_id)
      and not public.expense_category_is_superadmin_only(category_id)
    )
  );

drop policy if exists stock_items_select on public.stock_items;
create policy stock_items_select on public.stock_items
  for select using (public.can_access_business(business_id));

drop policy if exists stock_items_write on public.stock_items;
create policy stock_items_write on public.stock_items
  for all using (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and public.can_access_business(business_id))
  )
  with check (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and public.can_access_business(business_id))
  );

drop policy if exists stock_entries_select on public.stock_entries;
create policy stock_entries_select on public.stock_entries
  for select using (public.can_access_branch(branch_id));

drop policy if exists stock_entries_write on public.stock_entries;
create policy stock_entries_write on public.stock_entries
  for all using (public.can_access_branch(branch_id))
  with check (public.can_access_branch(branch_id));

drop policy if exists cash_deposits_select on public.cash_deposits;
create policy cash_deposits_select on public.cash_deposits
  for select using (public.can_access_branch(branch_id));

drop policy if exists cash_deposits_write on public.cash_deposits;
create policy cash_deposits_write on public.cash_deposits
  for all using (public.can_access_branch(branch_id))
  with check (public.can_access_branch(branch_id));

-- The branch a shift belongs to can no longer be read off the profile, so the
-- caller says which store it is timing in at and the function checks the
-- access list. Everything else about the clock is unchanged: the timestamp is
-- still the server's, and a person still works at most one shift a day.
drop function if exists public.clock_in(text);
create or replace function public.clock_in(p_photo_path text, p_branch_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_work_date date;
  v_id uuid;
begin
  v_role := public.current_role();

  if v_role is null then
    raise exception 'Not signed in.';
  end if;
  if v_role = 'superadmin' then
    raise exception 'This account does not time in.';
  end if;
  if not public.can_access_branch(p_branch_id) then
    raise exception 'This account cannot time in at that store.';
  end if;

  v_work_date := (now() at time zone 'Asia/Manila')::date;

  if exists (
    select 1 from public.shifts
    where profile_id = auth.uid() and status = 'open'
  ) then
    raise exception 'You are already timed in.';
  end if;
  if exists (
    select 1 from public.shifts
    where profile_id = auth.uid() and work_date = v_work_date
  ) then
    raise exception 'Today is already recorded.';
  end if;

  insert into public.shifts (
    profile_id, branch_id, work_date, time_in, photo_in_path, status
  )
  values (auth.uid(), p_branch_id, v_work_date, now(), p_photo_path, 'open')
  returning id into v_id;

  return v_id;
end;
$$;

-- Last, so a policy still reading the old column stops the migration instead of
-- quietly losing its branch check.
alter table public.profiles
  drop constraint if exists superadmin_has_no_branch;

alter table public.profiles
  drop column if exists branch_id;

drop function if exists public.current_branch_id();
drop function if exists public.current_business_id();
