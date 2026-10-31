-- Socod admin dashboard (31 Oct 2026)
-- STATUS: NOT APPLIED. Written for the founder's approval. Do not run on the live "Socod" project
-- (ref bckhcixpwnrxzldynfuu) until the founder says yes. Steps are in docs/ADMIN_DASHBOARD.md.
--
-- What this adds, in plain words:
--   1. socod_admins    - the short list of people allowed to open the dashboard. Nobody can read or
--                        change it through the app or the website; it is edited only in the
--                        Supabase SQL editor by the founder.
--   2. socod_feedback  - a place for the app to send "idea / problem / praise" messages (used by
--                        app version 1.1). A user can send feedback but can never read anyone's,
--                        not even their own. At most 5 messages per person per day.
--   3. Four read-only functions the dashboard calls. Each one first checks that the caller is:
--        signed in with a real (non-anonymous) account, AND
--        has passed the 6-digit authenticator code step (aal2), AND
--        is on socod_admins.
--      If any check fails, the function returns nothing and raises "not allowed".
--      They return totals and counts only, never names, emails or user ids.
--
-- Nothing here changes or deletes existing tables or rows.

begin;

-- 1. Admin allow-list ---------------------------------------------------------------------------
create table if not exists public.socod_admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  note     text check (note is null or char_length(note) <= 60),
  added_at timestamptz not null default now()
);
alter table public.socod_admins enable row level security;
-- Deliberately no policies: the app and website can neither read nor write this table.
revoke all on table public.socod_admins from public, anon, authenticated;

-- 2. In-app feedback ----------------------------------------------------------------------------
create table if not exists public.socod_feedback (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null default 'idea' check (kind in ('idea', 'problem', 'praise', 'other')),
  message     text not null check (char_length(btrim(message)) between 1 and 1000),
  lang        text check (lang is null or lang in ('so', 'en', 'ar')),
  app_version text check (app_version is null or char_length(app_version) <= 20),
  created_at  timestamptz not null default now()
);
create index if not exists socod_feedback_created_idx on public.socod_feedback (created_at desc);
create index if not exists socod_feedback_user_idx on public.socod_feedback (user_id, created_at desc);
alter table public.socod_feedback enable row level security;

drop policy if exists "send own feedback" on public.socod_feedback;
create policy "send own feedback" on public.socod_feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- No select/update/delete policies: nobody reads feedback through the API; admins use the function.

revoke all on table public.socod_feedback from public, anon, authenticated;
grant insert (kind, message, lang, app_version) on table public.socod_feedback to authenticated;

-- Limit: 5 messages per person per 24 hours (stops spam from throw-away anonymous accounts).
create or replace function public.socod_feedback_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.socod_feedback f
       where f.user_id = new.user_id and f.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'feedback limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.socod_feedback_limit() from public, anon, authenticated;

drop trigger if exists socod_feedback_limit on public.socod_feedback;
create trigger socod_feedback_limit
  before insert on public.socod_feedback
  for each row execute function public.socod_feedback_limit();

-- 3. The admin gate ----------------------------------------------------------------------------
create or replace function public.socod_admin_check()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims jsonb := coalesce(auth.jwt(), '{}'::jsonb);
begin
  if auth.uid() is null
     or coalesce((claims ->> 'is_anonymous')::boolean, false)
     or coalesce(claims ->> 'aal', 'aal1') <> 'aal2'
     or not exists (select 1 from public.socod_admins a where a.user_id = auth.uid())
  then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.socod_admin_check() from public, anon;
grant execute on function public.socod_admin_check() to authenticated;

-- True for accounts on the admin list, so admins are left out of every user count.
create or replace function public.socod_is_admin_account(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.socod_admins a where a.user_id = p_user);
$$;
revoke all on function public.socod_is_admin_account(uuid) from public, anon, authenticated;

-- Am I an admin? (lets the dashboard say "this account is not on the list" without exposing data)
create or replace function public.socod_admin_whoami()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.socod_admin_check();
  return jsonb_build_object('ok', true, 'checked_at', now());
end;
$$;

-- 4. Overview totals ---------------------------------------------------------------------------
create or replace function public.socod_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.socod_admin_check();


  select jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total',     (select count(*) from auth.users u where u.deleted_at is null and not public.socod_is_admin_account(u.id)),
      'anonymous', (select count(*) from auth.users u where u.deleted_at is null and not public.socod_is_admin_account(u.id) and u.is_anonymous),
      'new_7d',    (select count(*) from auth.users u where u.deleted_at is null and not public.socod_is_admin_account(u.id) and u.created_at > now() - interval '7 days'),
      'new_30d',   (select count(*) from auth.users u where u.deleted_at is null and not public.socod_is_admin_account(u.id) and u.created_at > now() - interval '30 days'),
      'with_profile', (select count(*) from public.socod_profiles)
    ),
    'active', jsonb_build_object(
      'today', (select count(distinct d.user_id) from public.socod_days d where d.day >= current_date),
      'd7',    (select count(distinct d.user_id) from public.socod_days d where d.day > current_date - 7),
      'd30',   (select count(distinct d.user_id) from public.socod_days d where d.day > current_date - 30),
      'signed_in_7d', (select count(*) from auth.users u where u.deleted_at is null and not public.socod_is_admin_account(u.id) and u.last_sign_in_at > now() - interval '7 days')
    ),
    'unlocks_30d', jsonb_build_object(
      'walk_or_workout', (select count(*) from public.socod_days d where d.day > current_date - 30 and d.done and not d.by_oath),
      'promise',         (select count(*) from public.socod_days d where d.day > current_date - 30 and d.by_oath),
      'steps',           (select coalesce(sum(d.steps), 0) from public.socod_days d where d.day > current_date - 30),
      'workout_minutes', (select coalesce(sum(d.workout_sec), 0) / 60 from public.socod_days d where d.day > current_date - 30)
    ),
    'languages', jsonb_build_object(
      'so', (select count(*) from public.socod_profiles p where p.lang = 'so'),
      'en', (select count(*) from public.socod_profiles p where p.lang = 'en'),
      'ar', (select count(*) from public.socod_profiles p where p.lang = 'ar')
    ),
    'modes', jsonb_build_object(
      'walk',    (select count(*) from public.socod_profiles p where p.mode = 'walk'),
      'workout', (select count(*) from public.socod_profiles p where p.mode = 'workout')
    ),
    'community', jsonb_build_object(
      'groups',             (select count(*) from public.socod_groups),
      'group_members',      (select count(*) from public.socod_group_members),
      'challenge_sign_ups', (select count(*) from public.socod_challenge_members)
    ),
    'feedback', jsonb_build_object(
      'total',  (select count(*) from public.socod_feedback),
      'new_7d', (select count(*) from public.socod_feedback f where f.created_at > now() - interval '7 days')
    ),
    -- Premium and tips are sold through Apple; the database does not record them.
    'sales', jsonb_build_object('recorded', false, 'where', 'App Store Connect > Sales and Trends')
  ) into result;

  return result;
end;
$$;

-- 5. Day-by-day series -------------------------------------------------------------------------
create or replace function public.socod_admin_daily(p_days integer default 30)
returns table (day date, active_users integer, unlocks integer, new_users integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n integer := least(greatest(coalesce(p_days, 30), 7), 90);
begin
  perform public.socod_admin_check();

  return query
  select g.day::date,
         (select count(distinct d.user_id)::integer from public.socod_days d where d.day = g.day::date),
         (select count(*)::integer from public.socod_days d where d.day = g.day::date and d.done),
         (select count(*)::integer from auth.users u
           where u.deleted_at is null and not public.socod_is_admin_account(u.id) and u.created_at >= g.day and u.created_at < g.day + interval '1 day')
  from generate_series(current_date - (n - 1), current_date, interval '1 day') as g(day)
  order by 1;
end;
$$;

-- 6. Latest feedback (no user ids) -------------------------------------------------------------
create or replace function public.socod_admin_feedback(p_limit integer default 50)
returns table (id bigint, kind text, message text, lang text, app_version text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.socod_admin_check();

  return query
  select f.id, f.kind, f.message, f.lang, f.app_version, f.created_at
  from public.socod_feedback f
  order by f.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- Only signed-in callers may even try; the gate inside decides the rest.
revoke all on function public.socod_admin_whoami()            from public, anon;
revoke all on function public.socod_admin_overview()          from public, anon;
revoke all on function public.socod_admin_daily(integer)      from public, anon;
revoke all on function public.socod_admin_feedback(integer)   from public, anon;
grant execute on function public.socod_admin_whoami()          to authenticated;
grant execute on function public.socod_admin_overview()        to authenticated;
grant execute on function public.socod_admin_daily(integer)    to authenticated;
grant execute on function public.socod_admin_feedback(integer) to authenticated;

commit;
