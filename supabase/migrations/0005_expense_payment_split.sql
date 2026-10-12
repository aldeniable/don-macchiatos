-- Expenses counted by where the money came from: the branch's cash drawer vs an
-- online transfer. Cash expenses never reach the bank, so the deposit ledger has
-- to be able to take them out of the cash a branch is expected to hand over.
-- A day still holds one row per branch/category, so the unique key and the
-- delete-then-insert save stay as they were.
-- Run in the Supabase SQL editor, or via `supabase db push`.

alter table public.expense_entries
  add column if not exists cash_amount numeric(12, 2) not null default 0
    check (cash_amount >= 0),
  add column if not exists online_amount numeric(12, 2) not null default 0
    check (online_amount >= 0);

-- `amount` becomes the generated total, so reports and any hand-written SQL that
-- reads it keep working untouched. Rows written before the split carry a single
-- untagged amount: a superadmin-only type is the owner paying a supplier himself
-- and never touches the drawer, so it is read as online, and everything else as
-- cash.
do $$ begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'expense_entries'
      and column_name = 'amount'
      and is_generated = 'NEVER'
  ) then
    update public.expense_entries e
    set
      cash_amount = case
        when public.expense_category_is_superadmin_only(e.category_id) then 0
        else e.amount
      end,
      online_amount = case
        when public.expense_category_is_superadmin_only(e.category_id) then e.amount
        else 0
      end
    where e.cash_amount = 0 and e.online_amount = 0;

    alter table public.expense_entries drop column amount;
    alter table public.expense_entries
      add column amount numeric(12, 2)
      generated always as (cash_amount + online_amount) stored;
  end if;
end $$;
