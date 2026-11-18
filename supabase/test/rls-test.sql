\set ON_ERROR_STOP on
-- Set up: an admin invite, then accounts created the way the app does it.
insert into public.invites (email, role, name) values ('admin@club.ro', 'admin', 'Admin');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'Admin@Club.ro');

-- helper to act as a user
create or replace function pg_temp.act(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, false);
end $$;

-- 1. admin creates invites for a coach and a viewer
set role authenticated;
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select role from profiles where id = auth.uid()) = 'admin', 'first account should be admin from invite';
  assert (select count(*) from invites) = 0, 'used invite should be removed';
end $$;
insert into invites (email, role, name) values ('coach@club.ro', 'coach', 'Coach'), ('parent@club.ro', 'viewer', 'Parent');
insert into plans (id, data) values ('p1', '{"name":"U7"}');
insert into activities (id, data) values ('a1', '{"title":"Mine"}');
insert into players (id, data) values ('k1', '{"name":"Andrei"}');
insert into runs (id, data) values ('r1', '{"planId":"p1"}');
insert into notes (id, data) values ('n-admin', '{"text":"admin note"}');
reset role;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000c', 'coach@club.ro'),
  ('00000000-0000-0000-0000-00000000000b', 'parent@club.ro'),
  ('00000000-0000-0000-0000-00000000000f', 'stranger@example.com');

do $$ begin
  assert (select role from profiles where email = 'coach@club.ro') = 'coach', 'coach role';
  assert (select role from profiles where email = 'parent@club.ro') = 'viewer', 'viewer role';
  assert (select role from profiles where email = 'stranger@example.com') = 'pending', 'uninvited signup is pending';
  assert (select updated_by from plans where id = 'p1') = '00000000-0000-0000-0000-00000000000a', 'updated_by is set';
end $$;

-- 2. coach
set role authenticated;
select pg_temp.act('00000000-0000-0000-0000-00000000000c');
do $$
declare n int;
begin
  assert (select count(*) from plans) = 1, 'coach reads plans';
  assert (select count(*) from activities) = 1, 'coach reads activities';
  assert (select count(*) from players) = 1, 'coach reads players';
  assert (select count(*) from runs) = 1, 'coach reads runs';
  assert (select count(*) from notes) = 1, 'coach reads notes';
  assert (select count(*) from profiles) = 1, 'coach sees only own profile';
  assert (select count(*) from invites) = 0, 'coach sees no invites';

  begin insert into plans (id, data) values ('p2', '{}'); raise exception 'coach created a plan';
  exception when insufficient_privilege then null; end;
  begin insert into players (id, data) values ('k2', '{}'); raise exception 'coach created a player';
  exception when insufficient_privilege then null; end;
  begin insert into activities (id, data) values ('a2', '{}'); raise exception 'coach created an activity';
  exception when insufficient_privilege then null; end;
  begin insert into invites (email, role) values ('x@y.z', 'admin'); raise exception 'coach created an invite';
  exception when insufficient_privilege then null; end;

  update plans set data = '{"hacked":true}' where id = 'p1'; get diagnostics n = row_count;
  assert n = 0, 'coach changed a plan';
  delete from players where id = 'k1'; get diagnostics n = row_count;
  assert n = 0, 'coach deleted a player';
  update profiles set role = 'admin' where id = auth.uid(); get diagnostics n = row_count;
  assert n = 0, 'coach promoted themself';

  -- allowed: run a session and write notes
  insert into runs (id, data) values ('r2', '{"planId":"p1"}');
  insert into runs (id, data) values ('r2', '{"planId":"p1","step":3}') on conflict (id) do update set data = excluded.data;
  update runs set data = '{"planId":"p1","step":4}' where id = 'r1'; get diagnostics n = row_count;
  assert n = 1, 'coach updates a run';
  insert into notes (id, data) values ('n-coach', '{"text":"brave dribble"}');
  update notes set data = '{"text":"edited"}' where id = 'n-coach'; get diagnostics n = row_count;
  assert n = 1, 'coach edits own note';
  update notes set data = '{"text":"edited"}' where id = 'n-admin'; get diagnostics n = row_count;
  assert n = 0, 'coach edited someone else''s note';
  delete from notes where id = 'n-admin'; get diagnostics n = row_count;
  assert n = 0, 'coach deleted someone else''s note';
  begin insert into notes (id, data, created_by) values ('n-fake', '{}', '00000000-0000-0000-0000-00000000000a');
    raise exception 'coach wrote a note as someone else';
  exception when insufficient_privilege then null; end;
  delete from runs where id = 'r2'; get diagnostics n = row_count;
  assert n = 0, 'coach deleted a run';
end $$;

-- 3. viewer (player / parent)
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
do $$
declare n int;
begin
  assert (select count(*) from plans) = 1, 'viewer reads plans';
  assert (select count(*) from activities) = 1, 'viewer reads activities';
  assert (select count(*) from players) = 0, 'viewer must not see players';
  assert (select count(*) from runs) = 0, 'viewer must not see runs';
  assert (select count(*) from notes) = 0, 'viewer must not see notes';
  begin insert into runs (id, data) values ('r3', '{}'); raise exception 'viewer started a run';
  exception when insufficient_privilege then null; end;
  begin insert into notes (id, data) values ('n3', '{}'); raise exception 'viewer wrote a note';
  exception when insufficient_privilege then null; end;
  update plans set data = '{}' where id = 'p1'; get diagnostics n = row_count;
  assert n = 0, 'viewer changed a plan';
end $$;

-- 4. pending sign-up and logged-out visitor see nothing
select pg_temp.act('00000000-0000-0000-0000-00000000000f');
do $$ begin
  assert (select count(*) from plans) + (select count(*) from activities) + (select count(*) from players) = 0, 'pending account sees data';
end $$;
reset role;
set role anon;
do $$ begin assert public.ping() = 1, 'anon can ping'; end $$;
do $$ begin
  perform 1 from plans;
  raise exception 'anon could read plans';
exception when insufficient_privilege then null;
end $$;
reset role;

-- 5. admin manages accounts, and disabled accounts lose access
set role authenticated;
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  assert (select count(*) from profiles) = 4, 'admin sees all profiles';
  assert (select count(*) from notes) = 2, 'admin sees all notes';
  update profiles set role = 'disabled' where email = 'coach@club.ro'; get diagnostics n = row_count;
  assert n = 1, 'admin disables an account';
  delete from notes where id = 'n-coach'; get diagnostics n = row_count;
  assert n = 1, 'admin deletes any note';
  delete from profiles where id = auth.uid(); get diagnostics n = row_count;
  assert n = 0, 'admin deleted their own profile';
end $$;
select pg_temp.act('00000000-0000-0000-0000-00000000000c');
do $$ begin
  assert (select count(*) from plans) = 0, 'disabled coach still reads plans';
end $$;
reset role;
select 'ALL RLS TESTS PASSED' as result;
