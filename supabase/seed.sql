-- Seed businesses, branches, catalog, and expense types.
-- Create auth users in the dashboard first, then map them in public.profiles.

insert into public.businesses (slug, name)
values
  ('don-macchiatos', 'Don Macchiatos'),
  ('don-lemon', 'Don Lemon'),
  ('yogurt', 'Yogurt')
on conflict (slug) do nothing;

insert into public.branches (business_id, name)
select id, 'Main' from public.businesses where slug = 'don-macchiatos'
on conflict do nothing;

insert into public.branches (business_id, name)
select id, 'SM City' from public.businesses where slug = 'don-macchiatos'
on conflict do nothing;

insert into public.branches (business_id, name)
select id, 'Main' from public.businesses where slug = 'don-lemon'
on conflict do nothing;

insert into public.branches (business_id, name)
select id, 'Main' from public.businesses where slug = 'yogurt'
on conflict do nothing;

insert into public.products (business_id, name, sort_order)
select b.id, p.name, p.sort_order
from public.businesses b
join (
  values
    ('don-macchiatos', 'Spanish Latte', 1),
    ('don-macchiatos', 'Caramel Macchiato', 2),
    ('don-macchiatos', 'Americano', 3),
    ('don-macchiatos', 'Croissant', 4),
    ('don-lemon', 'Classic Lemonade', 1),
    ('don-lemon', 'Yakult Lemon', 2),
    ('don-lemon', 'Honey Lemon', 3),
    ('yogurt', 'Classic Yogurt', 1),
    ('yogurt', 'Mango Yogurt', 2),
    ('yogurt', 'Strawberry Yogurt', 3)
) as p(slug, name, sort_order) on p.slug = b.slug
on conflict do nothing;

insert into public.expense_categories (business_id, name, sort_order)
select b.id, c.name, c.sort_order
from public.businesses b
join (
  values
    ('Ice', 1),
    ('Cups', 2),
    ('Milk', 3),
    ('Rent', 4),
    ('Utilities', 5),
    ('Others', 6)
) as c(name, sort_order) on true
on conflict do nothing;

-- After creating a superadmin auth user, promote them:
-- update public.profiles set role = 'superadmin', branch_id = null where id = '<user-uuid>';
