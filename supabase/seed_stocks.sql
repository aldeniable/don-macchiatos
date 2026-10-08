-- Seed the stock catalog for each business.
-- Safe to re-run: items are matched on (business_id, lower(name)).
--
-- Edit the values block below. Columns are:
--   business slug, item name, sort order
-- Valid slugs: 'don-macchiatos', 'don-lemon', 'shawarma'.
--
-- Every stock is counted as a plain quantity (whole numbers), so there is no
-- unit of measure to record.
--
-- Anything not in the list is marked inactive rather than deleted, so existing
-- stock_entries rows keep pointing at a real item.
--
-- The catalog lives in a CTE rather than a temporary table so the whole thing
-- is one self-contained statement. Clients that run each statement in its own
-- transaction (the Supabase SQL editor among them) drop a temporary table
-- before the next statement can read it.

with catalog(slug, name, sort_order) as (
  values
    ('don-macchiatos', 'Milk', 1),
    ('don-macchiatos', 'Coffee', 2),
    ('don-macchiatos', 'Fructose', 3),
    ('don-macchiatos', 'Caramel', 4),
    ('don-macchiatos', 'Cups', 5),
    ('don-macchiatos', 'Lids', 6),
    ('don-macchiatos', 'Straw', 7),
    ('don-macchiatos', 'Matcha', 8),
    ('don-macchiatos', 'Darko', 9),
    ('don-macchiatos', 'Strawberry', 10),
    ('don-macchiatos', 'Oreo powder', 11),
    ('don-macchiatos', 'Crushed oreo', 12),
    ('don-macchiatos', 'Pistachio', 13),
    ('don-macchiatos', 'Single plastic bag', 14),
    ('don-macchiatos', 'Double plastic bag', 15),

    ('don-lemon', 'Big cups', 1),
    ('don-lemon', 'Small cups', 2),
    ('don-lemon', 'Sealing film', 3),
    ('don-lemon', 'Small straw', 4),
    ('don-lemon', 'Big straw', 5),
    ('don-lemon', 'Lemon', 6),
    ('don-lemon', 'Fructose', 7),
    ('don-lemon', 'Blacktea', 8),
    ('don-lemon', 'Rainbow jelly', 9),
    ('don-lemon', 'Popping bobba', 10),
    ('don-lemon', 'Honey', 11),
    ('don-lemon', 'Nata de coco', 12),
    ('don-lemon', 'Chia seeds', 13),
    ('don-lemon', 'Yakult', 14),
    ('don-lemon', 'Yellow peach', 15),
    ('don-lemon', 'Strawberry', 16),
    ('don-lemon', 'Passion fruit', 17),
    ('don-lemon', 'Green apple', 18),
    ('don-lemon', 'Mango', 19),
    ('don-lemon', 'Orange', 20),
    ('don-lemon', 'Kiwi', 21),
    ('don-lemon', 'Pineapple', 22),
    ('don-lemon', 'Single plastic bag', 23),
    ('don-lemon', 'Double plastic bag', 24),

    ('shawarma', 'Large pita', 1),
    ('shawarma', 'Regular pita', 2),
    ('shawarma', 'Beef', 3),
    ('shawarma', 'Chili sauce', 4),
    ('shawarma', 'Cheese sauce', 5),
    ('shawarma', 'Garlic sauce', 6),
    ('shawarma', 'Wrapper', 7)
),
target as (
  select b.id as business_id, c.name, c.sort_order
  from public.businesses b
  join catalog c on c.slug = b.slug
),
seeded as (
  insert into public.stock_items (business_id, name, sort_order)
  select t.business_id, t.name, t.sort_order
  from target t
  on conflict (business_id, lower(name)) do update
    set sort_order = excluded.sort_order,
        is_active = true
  returning 1
),
hidden as (
  update public.stock_items si
  set is_active = false
  where si.is_active
    and si.business_id in (select business_id from target)
    and not exists (
      select 1
      from target t
      where t.business_id = si.business_id
        and lower(t.name) = lower(si.name)
    )
  returning 1
)
select
  (select count(*) from seeded) as items_seeded,
  (select count(*) from hidden) as items_hidden;

-- Optional: reset every branch's counts to 0. Balances are the sum of
-- movements, so deleting the movements is what makes each item read zero.
-- Leave this out once staff have started recording, or it wipes their counts.
delete from public.stock_entries e
using public.branches br, public.businesses b
where br.id = e.branch_id
  and b.id = br.business_id
  and b.slug in ('don-macchiatos', 'don-lemon', 'shawarma');
