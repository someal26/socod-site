-- Database test for supabase/migrations/20261031180000_socod_admin_dashboard.sql
-- Runs on a throwaway local Postgres (tests/db/run.sh). Every check raises on failure.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

insert into public.socod_admins (user_id, note) values ('00000000-0000-0000-0000-00000000a001', 'founder (demo)');

-- 1. Signed-out visitors (anon) cannot call any admin function.
begin;
set local role anon;
do $$ begin
  perform public.socod_admin_overview();
  raise exception 'FAIL 1: anon could call socod_admin_overview';
exception when insufficient_privilege then raise notice 'PASS 1: signed-out visitor blocked';
end $$;
rollback;

-- 2. Anonymous app accounts (every Socod user today) are blocked, even with aal2 claimed.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","is_anonymous":true,"aal":"aal2"}', true);
do $$ begin
  perform public.socod_admin_overview();
  raise exception 'FAIL 2: anonymous app user could read the dashboard';
exception when insufficient_privilege then raise notice 'PASS 2: anonymous app user blocked';
end $$;
rollback;

-- 3. A real account that is not on the allow-list is blocked.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000b001","is_anonymous":false,"aal":"aal2"}', true);
do $$ begin
  perform public.socod_admin_daily(30);
  raise exception 'FAIL 3: non-admin could read daily data';
exception when insufficient_privilege then raise notice 'PASS 3: non-admin account blocked';
end $$;
rollback;

-- 4. The admin without the authenticator code step (aal1) is blocked.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","is_anonymous":false,"aal":"aal1"}', true);
do $$ begin
  perform public.socod_admin_feedback(10);
  raise exception 'FAIL 4: admin without 2-step code could read feedback';
exception when insufficient_privilege then raise notice 'PASS 4: password alone is not enough';
end $$;
rollback;

-- 5. App users can send feedback, cannot read it, cannot send as someone else, max 5 per day.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000c001","is_anonymous":true,"aal":"aal1"}', true);
insert into public.socod_feedback (kind, message, lang, app_version) values ('idea', 'Please add Quran reading as a task', 'en', '1.0.1');
do $$ begin
  perform 1 from public.socod_feedback;
  raise exception 'FAIL 5a: an app user could read feedback';
exception when insufficient_privilege then raise notice 'PASS 5a: feedback is write-only for users';
end $$;
do $$ begin
  insert into public.socod_feedback (user_id, message) values ('00000000-0000-0000-0000-00000000c002', 'spoof');
  raise exception 'FAIL 5b: user could send feedback as another user';
exception when insufficient_privilege then raise notice 'PASS 5b: cannot send as someone else';
end $$;
insert into public.socod_feedback (message) values ('2'), ('3'), ('4'), ('5');
do $$ begin
  insert into public.socod_feedback (message) values ('6');
  raise exception 'FAIL 5c: daily feedback limit not enforced';
exception when raise_exception then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'PASS 5c: 5-per-day limit enforced';
end $$;
do $$ begin
  perform 1 from public.socod_admins;
  raise exception 'FAIL 5d: app user could read the admin list';
exception when insufficient_privilege then raise notice 'PASS 5d: admin list is hidden';
end $$;
do $$ begin
  insert into public.socod_admins (user_id) values ('00000000-0000-0000-0000-00000000c001');
  raise exception 'FAIL 5e: app user could add themselves as admin';
exception when insufficient_privilege then raise notice 'PASS 5e: cannot self-promote to admin';
end $$;
commit;

-- 6. Signed-out visitors cannot send feedback.
begin;
set local role anon;
do $$ begin
  insert into public.socod_feedback (message) values ('hello');
  raise exception 'FAIL 6: anon could send feedback';
exception when insufficient_privilege then raise notice 'PASS 6: signed-out visitor cannot send feedback';
end $$;
rollback;

-- 7. The admin with the code step sees correct totals, and nothing personal.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000a001","is_anonymous":false,"aal":"aal2"}', true);
do $$
declare
  o jsonb := public.socod_admin_overview();
  n integer;
  r record;
begin
  if (o #>> '{users,total}')::int <> 4 then raise exception 'FAIL 7a: users.total (admins excluded) = %', o #>> '{users,total}'; end if;
  if (o #>> '{users,anonymous}')::int <> 3 then raise exception 'FAIL 7b: users.anonymous'; end if;
  if (o #>> '{users,new_7d}')::int <> 2 then raise exception 'FAIL 7c: users.new_7d'; end if;
  if (o #>> '{active,d7}')::int <> 2 then raise exception 'FAIL 7d: active.d7 = %', o #>> '{active,d7}'; end if;
  if (o #>> '{active,today}')::int <> 1 then raise exception 'FAIL 7e: active.today'; end if;
  if (o #>> '{unlocks_30d,promise}')::int <> 1 then raise exception 'FAIL 7f: promise unlocks'; end if;
  if (o #>> '{unlocks_30d,walk_or_workout}')::int <> 3 then raise exception 'FAIL 7g: walk unlocks'; end if;
  if (o #>> '{languages,ar}')::int <> 1 then raise exception 'FAIL 7h: languages'; end if;
  if (o #>> '{feedback,total}')::int <> 5 then raise exception 'FAIL 7i: feedback total'; end if;
  if (o #>> '{sales,recorded}')::boolean then raise exception 'FAIL 7j: sales flag'; end if;
  if o::text ~* '(email|@example|00000000-0000)' then raise exception 'FAIL 7k: overview leaks personal data'; end if;

  select count(*) into n from public.socod_admin_daily(30);
  if n <> 30 then raise exception 'FAIL 7l: daily rows = %', n; end if;
  select count(*) into n from public.socod_admin_daily(100000);
  if n <> 90 then raise exception 'FAIL 7m: daily not capped at 90 (got %)', n; end if;
  select count(*) into n from public.socod_admin_daily(-5);
  if n <> 7 then raise exception 'FAIL 7n: daily floor not 7 (got %)', n; end if;
  select sum(unlocks) into n from public.socod_admin_daily(7);
  if n <> 4 then raise exception 'FAIL 7o: unlocks in last 7 days = %', n; end if;

  select count(*) into n from public.socod_admin_feedback(3);
  if n <> 3 then raise exception 'FAIL 7p: feedback limit'; end if;
  for r in select * from public.socod_admin_feedback(50) loop
    if to_jsonb(r) ? 'user_id' then raise exception 'FAIL 7q: feedback exposes user ids'; end if;
  end loop;
  raise notice 'PASS 7: admin sees correct totals and no personal data';
end $$;
rollback;

-- 8. Every admin function is SECURITY DEFINER with a pinned search_path and is not callable by anon.
do $$
declare
  r record;
begin
  for r in
    select p.proname, p.prosecdef, p.proconfig,
           has_function_privilege('anon', p.oid, 'execute') as anon_exec
    from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname like 'socod_admin%'
  loop
    if not r.prosecdef then raise exception 'FAIL 8: % is not security definer', r.proname; end if;
    if r.proconfig is null or not ('search_path=""' = any (r.proconfig)) then
      raise exception 'FAIL 8: % has no pinned search_path (%)', r.proname, r.proconfig;
    end if;
    if r.anon_exec then raise exception 'FAIL 8: anon can execute %', r.proname; end if;
  end loop;
  raise notice 'PASS 8: functions are definer-owned, search_path pinned, closed to anon';
end $$;

-- 9. Every public table still has row-level security on.
do $$
declare n integer;
begin
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if n > 0 then raise exception 'FAIL 9: % public tables without RLS', n; end if;
  raise notice 'PASS 9: every public table has row-level security';
end $$;

\echo 'ALL DATABASE CHECKS PASSED'
