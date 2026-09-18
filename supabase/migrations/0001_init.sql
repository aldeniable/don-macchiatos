-- Don Macchiatos ops schema
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('superadmin', 'admin', 'user');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  branch_id uuid references public.branches(id) on delete set null,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  constraint superadmin_has_no_branch check (
    role <> 'superadmin' or branch_id is null
  )
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.branch_product_prices (
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(12, 2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  primary key (branch_id, product_id)
);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id),
  entry_date date not null,
  quantity numeric(12, 2) not null check (quantity >= 0),
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  recorded_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (branch_id, entry_date, product_id)
);

create table if not exists public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  category_id uuid not null references public.expense_categories(id),
  entry_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  recorded_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (branch_id, entry_date, category_id)
);

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.business_id
  from public.profiles p
  left join public.branches b on b.id = p.branch_id
  where p.id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.businesses enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.branch_product_prices enable row level security;
alter table public.expense_categories enable row level security;
alter table public.sales_entries enable row level security;
alter table public.expense_entries enable row level security;

drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select using (
    public.current_role() = 'superadmin'
    or id = public.current_business_id()
  );

drop policy if exists businesses_write on public.businesses;
create policy businesses_write on public.businesses
  for all using (public.current_role() = 'superadmin')
  with check (public.current_role() = 'superadmin');

drop policy if exists branches_select on public.branches;
create policy branches_select on public.branches
  for select using (
    public.current_role() = 'superadmin'
    or id = public.current_branch_id()
  );

drop policy if exists branches_write on public.branches;
create policy branches_write on public.branches
  for all using (public.current_role() = 'superadmin')
  with check (public.current_role() = 'superadmin');

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    public.current_role() = 'superadmin'
    or id = auth.uid()
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_role());

drop policy if exists profiles_superadmin_write on public.profiles;
create policy profiles_superadmin_write on public.profiles
  for all using (public.current_role() = 'superadmin')
  with check (public.current_role() = 'superadmin');

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (
    public.current_role() = 'superadmin'
    or business_id = public.current_business_id()
  );

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all using (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and business_id = public.current_business_id())
  )
  with check (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and business_id = public.current_business_id())
  );

drop policy if exists prices_select on public.branch_product_prices;
create policy prices_select on public.branch_product_prices
  for select using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );

drop policy if exists prices_write on public.branch_product_prices;
create policy prices_write on public.branch_product_prices
  for all using (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and branch_id = public.current_branch_id())
  )
  with check (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and branch_id = public.current_branch_id())
  );

drop policy if exists expense_categories_select on public.expense_categories;
create policy expense_categories_select on public.expense_categories
  for select using (
    public.current_role() = 'superadmin'
    or business_id = public.current_business_id()
  );

drop policy if exists expense_categories_write on public.expense_categories;
create policy expense_categories_write on public.expense_categories
  for all using (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and business_id = public.current_business_id())
  )
  with check (
    public.current_role() = 'superadmin'
    or (public.current_role() = 'admin' and business_id = public.current_business_id())
  );

drop policy if exists sales_select on public.sales_entries;
create policy sales_select on public.sales_entries
  for select using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );

drop policy if exists sales_write on public.sales_entries;
create policy sales_write on public.sales_entries
  for all using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  )
  with check (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );

drop policy if exists expenses_select on public.expense_entries;
create policy expenses_select on public.expense_entries
  for select using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );

drop policy if exists expenses_write on public.expense_entries;
create policy expenses_write on public.expense_entries
  for all using (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  )
  with check (
    public.current_role() = 'superadmin'
    or branch_id = public.current_branch_id()
  );
