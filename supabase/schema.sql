-- Royal Club Coach: shared club database on Supabase.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run again: it only creates what is missing and replaces the rules.
--
-- Roles
--   admin    everything, including accounts
--   coach    trainee coach: reads everything, runs sessions (attendance, timers),
--            writes notes on children; cannot change sessions, activities,
--            players or accounts
--   viewer   player or parent: reads session plans and the activity library only
--   pending  signed up but not approved: sees nothing
--   disabled switched off by an admin: sees nothing

-- ---------------------------------------------------------------- accounts

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'pending' check (role in ('admin', 'coach', 'viewer', 'pending', 'disabled')),
  created_at timestamptz not null default now()
);

-- Accounts the admin has prepared. When someone signs up with this email
-- (or the admin creates the account in the app), they get this role.
create table if not exists public.invites (
  email text primary key,
  name text not null default '',
  role text not null check (role in ('admin', 'coach', 'viewer')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

-- The role of whoever is calling. Security definer so policies can read
-- profiles without recursing into the profiles policies.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'none');
$$;

-- New login → profile, with the role from the matching invite (or pending).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invites;
begin
  select * into inv from public.invites where email = lower(new.email);
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(inv.name, ''), new.raw_user_meta_data ->> 'name', ''),
    coalesce(inv.role, 'pending')
  )
  on conflict (id) do nothing;
  delete from public.invites where email = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- club data
-- Each row holds one item of the app (a plan, a player, …) as JSON.

create table if not exists public.activities (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
create table if not exists public.plans (like public.activities including all);
create table if not exists public.players (like public.activities including all);
create table if not exists public.runs (like public.activities including all);
create table if not exists public.notes (
  like public.activities including all,
  created_by uuid not null default auth.uid()
);

create or replace function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['activities', 'plans', 'players', 'runs', 'notes'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before insert or update on public.%I for each row execute function public.touch_row()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- access rules

alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.activities enable row level security;
alter table public.plans enable row level security;
alter table public.players enable row level security;
alter table public.runs enable row level security;
alter table public.notes enable row level security;

-- Start from a clean set of policies every time this file runs.
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('profiles', 'invites', 'activities', 'plans', 'players', 'runs', 'notes')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

-- profiles: you see yourself; admins see and manage everyone.
create policy "read own or admin" on public.profiles for select
  using (id = auth.uid() or public.app_role() = 'admin');
create policy "admin updates" on public.profiles for update
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');
create policy "admin deletes" on public.profiles for delete
  using (public.app_role() = 'admin' and id <> auth.uid());

-- invites: admins only.
create policy "admin manages invites" on public.invites for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- activities and plans: everyone with an active account reads; admins write.
create policy "members read" on public.activities for select
  using (public.app_role() in ('admin', 'coach', 'viewer'));
create policy "admin writes" on public.activities for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

create policy "members read" on public.plans for select
  using (public.app_role() in ('admin', 'coach', 'viewer'));
create policy "admin writes" on public.plans for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- players: coaches read (attendance, notes); only admins change the roster.
create policy "coaches read" on public.players for select
  using (public.app_role() in ('admin', 'coach'));
create policy "admin writes" on public.players for all
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- runs (sessions held, with attendance): coaches read and record them; admins delete.
create policy "coaches read" on public.runs for select
  using (public.app_role() in ('admin', 'coach'));
create policy "coaches add" on public.runs for insert
  with check (public.app_role() in ('admin', 'coach'));
create policy "coaches update" on public.runs for update
  using (public.app_role() in ('admin', 'coach')) with check (public.app_role() in ('admin', 'coach'));
create policy "admin deletes" on public.runs for delete
  using (public.app_role() = 'admin');

-- notes on children: coaches read all and write their own; admins manage all.
create policy "coaches read" on public.notes for select
  using (public.app_role() in ('admin', 'coach'));
create policy "coaches add own" on public.notes for insert
  with check (public.app_role() = 'admin' or (public.app_role() = 'coach' and created_by = auth.uid()));
create policy "own or admin update" on public.notes for update
  using (public.app_role() = 'admin' or (public.app_role() = 'coach' and created_by = auth.uid()))
  with check (public.app_role() = 'admin' or (public.app_role() = 'coach' and created_by = auth.uid()));
create policy "own or admin delete" on public.notes for delete
  using (public.app_role() = 'admin' or (public.app_role() = 'coach' and created_by = auth.uid()));

-- Logged-in users go through the policies above; logged-out visitors get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.invites, public.activities, public.plans, public.players, public.runs, public.notes to authenticated;
revoke all on public.profiles, public.invites, public.activities, public.plans, public.players, public.runs, public.notes from anon;
grant execute on function public.app_role() to authenticated;

-- Free Supabase projects pause after a week without use. The keep-alive
-- workflow (.github/workflows/keepalive.yml) calls this every few days.
-- It reads no club data.
create or replace function public.ping()
returns integer
language sql
stable
as $$
  select 1;
$$;
grant execute on function public.ping() to anon, authenticated;
