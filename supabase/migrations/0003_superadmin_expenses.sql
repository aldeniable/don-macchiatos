-- Expense types only a superadmin can see or record, seeded with "Stock Refill".
-- Their amounts still count toward branch expense totals, so an admin sees the
-- money in a day total and in reports without seeing the line behind it.
-- Run in the Supabase SQL editor, or via `supabase db push`.

alter table public.expense_categories
  add column if not exists is_superadmin_only boolean not null default false;

-- Sorted after every existing type so it lands at the bottom of the day form.
insert into public.expense_categories (business_id, name, sort_order, is_superadmin_only)
select
  b.id,
  'Stock Refill',
  coalesce(
    (select max(c.sort_order) from public.expense_categories c where c.business_id = b.id),
    0
  ) + 1,
  true
from public.businesses b
where not exists (
  select 1
  from public.expense_categories c
  where c.business_id = b.id
    and lower(c.name) = 'stock refill'
);

-- Row level security on expense_entries has to reach the flag on the category
-- a row points at.
create or replace function public.expense_category_is_superadmin_only(p_category_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_superadmin_only from public.expense_categories where id = p_category_id),
    false
  );
$$;

-- Admins keep their own expense types but cannot read, rename, hide, or unflag
-- a superadmin-only one.
drop policy if exists expense_categories_select on public.expense_categories;
create policy expense_categories_select on public.expense_categories
  for select using (
    public.current_role() = 'superadmin'
    or (business_id = public.current_business_id() and not is_superadmin_only)
  );

drop policy if exists expense_categories_write on public.expense_categories;
create policy expense_categories_write on public.expense_categories
  for all using (
    public.current_role() = 'superadmin'
    or (
      public.current_role() = 'admin'
      and business_id = public.current_business_id()
      and not is_superadmin_only
    )
  )
  with check (
    public.current_role() = 'superadmin'
    or (
      public.current_role() = 'admin'
      and business_id = public.current_business_id()
      and not is_superadmin_only
    )
  );

-- Reads stay branch-wide so totals keep including superadmin-only amounts; only
-- writes narrow. Saving a day rewrites it by deleting the branch/day rows first,
-- and a delete is checked against `using`, which keeps that off refill rows.
drop policy if exists expenses_write on public.expense_entries;
create policy expenses_write on public.expense_entries
  for all using (
    public.current_role() = 'superadmin'
    or (
      branch_id = public.current_branch_id()
      and not public.expense_category_is_superadmin_only(category_id)
    )
  )
  with check (
    public.current_role() = 'superadmin'
    or (
      branch_id = public.current_branch_id()
      and not public.expense_category_is_superadmin_only(category_id)
    )
  );
