-- Attendance and payroll: an employee times in and out of a shift by taking a
-- photo, and the owner approves the hours before they turn into pay.
--
-- A shift is paid as a day, not as hours: a pay tier's daily_rate covers one
-- full standard shift, and anything past it is paid at an hourly overtime rate.
-- Run in the Supabase SQL editor, or via `supabase db push`.

-- Two rates, picked per employee. The amounts are editable, so a raise is a
-- number change rather than a migration.
create table if not exists public.pay_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  daily_rate numeric(12, 2) not null check (daily_rate >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists pay_tiers_name_key
  on public.pay_tiers (lower(name));

insert into public.pay_tiers (name, daily_rate, sort_order)
values ('Standard', 400, 1), ('Senior', 450, 2)
on conflict do nothing;

-- Owner-wide settings, pinned to a single row: the overtime rate is the same
-- everywhere, so there is nothing to key it by.
create table if not exists public.pay_settings (
  id boolean primary key default true check (id),
  overtime_hourly_rate numeric(12, 2) not null default 50 check (overtime_hourly_rate >= 0),
  updated_at timestamptz not null default now()
);

insert into public.pay_settings (id) values (true) on conflict (id) do nothing;

-- A standard shift is 8 hours including lunch, except at Catarman where it is
-- 9. Keeping it on the branch means the rule is data the owner can change, not
-- a branch name hardcoded in the app.
alter table public.branches
  add column if not exists standard_shift_hours numeric(4, 2) not null default 8
    check (standard_shift_hours > 0 and standard_shift_hours <= 24);

update public.branches
set standard_shift_hours = 9
where name ilike '%catarman%'
  and standard_shift_hours = 8;

alter table public.profiles
  add column if not exists pay_tier_id uuid references public.pay_tiers(id) on delete set null;

do $$ begin
  create type public.shift_status as enum ('open', 'pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

-- One row per employee per work date. `time_in` and `time_out` are only ever
-- written from now() inside the clock functions below, so a phone with a wrong
-- clock, or a crafted request, cannot move them.
--
-- `approved_in` / `approved_out` are the owner's corrections for the shift that
-- someone forgot to time out of; null means the recorded times stand. The three
-- snapshot columns freeze the pay rules at approval, the same way a sale keeps
-- unit_price_snapshot, so editing a rate never rewrites history.
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  work_date date not null,
  time_in timestamptz not null,
  time_out timestamptz,
  photo_in_path text,
  photo_out_path text,
  status public.shift_status not null default 'open',
  approved_in timestamptz,
  approved_out timestamptz,
  daily_rate_snapshot numeric(12, 2),
  overtime_rate_snapshot numeric(12, 2),
  standard_minutes_snapshot int,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, work_date),
  constraint shift_times_ordered check (time_out is null or time_out > time_in),
  constraint shift_approved_times_ordered check (
    approved_out is null or approved_in is null or approved_out > approved_in
  )
);

-- A shift includes its lunch break, so nobody clocks out and back in during the
-- day: at most one shift is ever open.
create unique index if not exists shifts_one_open_per_profile
  on public.shifts (profile_id)
  where status = 'open';

create index if not exists shifts_branch_date_idx
  on public.shifts (branch_id, work_date);

-- Timing in. The caller supplies only the photo it just uploaded; the branch
-- comes from the profile and the timestamp from the server clock.
create or replace function public.clock_in(p_photo_path text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
  v_role public.user_role;
  v_work_date date;
  v_id uuid;
begin
  select branch_id, role into v_branch_id, v_role
  from public.profiles
  where id = auth.uid();

  if v_role is null then
    raise exception 'Not signed in.';
  end if;
  if v_role = 'superadmin' or v_branch_id is null then
    raise exception 'This account does not time in.';
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
  values (auth.uid(), v_branch_id, v_work_date, now(), p_photo_path, 'open')
  returning id into v_id;

  return v_id;
end;
$$;

-- Timing out. The open shift is found by the caller's own id, so there is
-- nothing to pass but the photo.
create or replace function public.clock_out(p_photo_path text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update public.shifts
  set
    time_out = now(),
    photo_out_path = p_photo_path,
    status = 'pending',
    updated_at = now()
  where profile_id = auth.uid()
    and status = 'open'
  returning id into v_id;

  if v_id is null then
    raise exception 'You are not timed in.';
  end if;

  return v_id;
end;
$$;

-- Time-in and time-out photos. Private: nothing is served straight from the
-- bucket. The server uploads with the service role and hands the owner
-- short-lived signed URLs, so a photo cannot be reached by guessing a path.
insert into storage.buckets (id, name, public)
values ('attendance', 'attendance', false)
on conflict (id) do nothing;

alter table public.pay_tiers enable row level security;
alter table public.pay_settings enable row level security;
alter table public.shifts enable row level security;

-- Pay rules are the owner's business alone: an employee never reads a rate.
drop policy if exists pay_tiers_superadmin on public.pay_tiers;
create policy pay_tiers_superadmin on public.pay_tiers
  for all using (public.current_role() = 'superadmin')
  with check (public.current_role() = 'superadmin');

drop policy if exists pay_settings_superadmin on public.pay_settings;
create policy pay_settings_superadmin on public.pay_settings
  for all using (public.current_role() = 'superadmin')
  with check (public.current_role() = 'superadmin');

-- An employee sees their own shifts and nobody else's, not even a branchmate's:
-- attendance is between that person and the owner. Deliberately narrower than
-- the branch-wide reads the sales and expense tables use.
drop policy if exists shifts_select on public.shifts;
create policy shifts_select on public.shifts
  for select using (
    public.current_role() = 'superadmin'
    or profile_id = auth.uid()
  );

-- No insert or update policy for employees. They write only through clock_in
-- and clock_out above, which run as the definer, so a recorded time can never
-- come from the client.
drop policy if exists shifts_superadmin_write on public.shifts;
create policy shifts_superadmin_write on public.shifts
  for all using (public.current_role() = 'superadmin')
  with check (public.current_role() = 'superadmin');
