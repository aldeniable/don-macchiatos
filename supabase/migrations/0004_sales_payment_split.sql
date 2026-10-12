-- Sales counted by how the customer paid: cash in the drawer vs an online transfer.
-- A day still holds one row per branch/product, so the unique key and the
-- delete-then-insert save stay as they were.
-- Run in the Supabase SQL editor, or via `supabase db push`.

alter table public.sales_entries
  add column if not exists cash_quantity numeric(12, 2) not null default 0
    check (cash_quantity >= 0),
  add column if not exists online_quantity numeric(12, 2) not null default 0
    check (online_quantity >= 0);

-- `quantity` becomes the generated total, so reports and any hand-written SQL
-- that multiplies it by the price snapshot keep working untouched. Rows written
-- before the split carry a single untagged count, which is read as cash.
do $$ begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sales_entries'
      and column_name = 'quantity'
      and is_generated = 'NEVER'
  ) then
    update public.sales_entries
    set cash_quantity = quantity
    where cash_quantity = 0 and online_quantity = 0;

    alter table public.sales_entries drop column quantity;
    alter table public.sales_entries
      add column quantity numeric(12, 2)
      generated always as (cash_quantity + online_quantity) stored;
  end if;
end $$;
