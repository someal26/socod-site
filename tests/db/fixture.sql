-- Test-only stand-in for the live Socod project (shapes copied read-only from the live schema on
-- 31 Oct 2026). Used by tests/db/run.sh on a throwaway local Postgres. Never run this on Supabase.

create role anon nologin;
create role authenticated nologin;

create schema auth;
grant usage on schema auth to anon, authenticated;

create table auth.users (
  id uuid primary key,
  email text,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  deleted_at timestamptz
);

-- Same behaviour as Supabase: identity comes from the signed JWT claims of the request.
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated;

grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;

create table public.socod_profiles (
  id uuid primary key references auth.users (id),
  display_name text not null default 'Socod',
  lang text not null default 'so' check (lang in ('so', 'en', 'ar')),
  mode text not null default 'walk' check (mode in ('walk', 'workout')),
  platform text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.socod_days (
  user_id uuid not null default auth.uid() references auth.users (id),
  day date not null,
  steps integer not null default 0,
  water integer not null default 0,
  done boolean not null default false,
  by_oath boolean not null default false,
  workout_sec integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create table public.socod_challenges (id text primary key, title jsonb not null default '{}', kind text not null default 'walks', target integer not null default 1);
create table public.socod_challenge_members (challenge_id text references public.socod_challenges (id), user_id uuid default auth.uid() references auth.users (id), joined_at timestamptz default now(), primary key (challenge_id, user_id));
create table public.socod_groups (id uuid primary key default gen_random_uuid(), name text not null, code text unique not null, owner uuid references auth.users (id), created_at timestamptz default now());
create table public.socod_group_members (group_id uuid references public.socod_groups (id), user_id uuid references auth.users (id), joined_at timestamptz default now(), primary key (group_id, user_id));

alter table public.socod_profiles enable row level security;
alter table public.socod_days enable row level security;
alter table public.socod_challenges enable row level security;
alter table public.socod_challenge_members enable row level security;
alter table public.socod_groups enable row level security;
alter table public.socod_group_members enable row level security;
create policy "own profile" on public.socod_profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "own days" on public.socod_days for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Demo data only (no real users).
insert into auth.users (id, email, is_anonymous, created_at, last_sign_in_at) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@example.test', false, now() - interval '40 days', now()),
  ('00000000-0000-0000-0000-00000000b001', 'staff@example.test', false, now() - interval '20 days', now()),
  ('00000000-0000-0000-0000-00000000c001', null, true, now() - interval '3 days', now()),
  ('00000000-0000-0000-0000-00000000c002', null, true, now() - interval '2 days', now() - interval '10 days'),
  ('00000000-0000-0000-0000-00000000c003', null, true, now() - interval '60 days', null);

insert into public.socod_profiles (id, lang, mode) values
  ('00000000-0000-0000-0000-00000000c001', 'so', 'walk'),
  ('00000000-0000-0000-0000-00000000c002', 'ar', 'workout'),
  ('00000000-0000-0000-0000-00000000c003', 'en', 'walk');

insert into public.socod_days (user_id, day, steps, done, by_oath, workout_sec) values
  ('00000000-0000-0000-0000-00000000c001', current_date, 3200, true, false, 0),
  ('00000000-0000-0000-0000-00000000c001', current_date - 1, 2800, true, false, 0),
  ('00000000-0000-0000-0000-00000000c002', current_date - 2, 0, true, true, 0),
  ('00000000-0000-0000-0000-00000000c002', current_date - 3, 0, true, false, 1200),
  ('00000000-0000-0000-0000-00000000c003', current_date - 45, 5000, true, false, 0);
