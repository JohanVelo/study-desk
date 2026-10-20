-- Lamp: tables, security and realtime. Everything lives in the "lamp" namespace of names.
create table if not exists public.lamp_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#3B5BBA',
  role text not null default 'member' check (role in ('member','leader')),
  joined_at timestamptz not null default now()
);
create table if not exists public.lamp_config (
  key text primary key,
  value text not null
);
create table if not exists public.lamp_docs (
  path text primary key check (path ~ '^[A-Za-z0-9_.:@+~-]+(/[A-Za-z0-9_.:@+~-]+)*$'),
  col text generated always as (regexp_replace(path, '/[^/]+$', '')) stored,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists lamp_docs_col on public.lamp_docs(col);
alter table public.lamp_docs replica identity full;

create or replace function public.lamp_is_member() returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from lamp_members where user_id = auth.uid()) $$;
create or replace function public.lamp_is_leader() returns boolean
language sql stable security definer set search_path = public as
$$ select exists(select 1 from lamp_members where user_id = auth.uid() and role = 'leader') $$;

-- who may read / write a document path
create or replace function public.lamp_can_read(p text) returns boolean
language sql stable as $$
  select case
    when p like 'data/users/%' then split_part(p,'/',3) = auth.uid()::text
    else public.lamp_is_member() end $$;
create or replace function public.lamp_can_write(p text) returns boolean
language sql stable as $$
  select case
    when p like 'data/users/%' then split_part(p,'/',3) = auth.uid()::text
    when p ~ '^(gm|lv)/[^/]+$' then split_part(p,'/',2) = auth.uid()::text and public.lamp_is_member()
    when p = 'group/meta' then public.lamp_is_leader()
    when p in ('group/ice','live/game') then public.lamp_is_member()
    else false end $$;

alter table public.lamp_docs enable row level security;
alter table public.lamp_members enable row level security;
alter table public.lamp_config enable row level security;
drop policy if exists lamp_docs_read on public.lamp_docs;
drop policy if exists lamp_docs_ins on public.lamp_docs;
drop policy if exists lamp_docs_upd on public.lamp_docs;
drop policy if exists lamp_docs_del on public.lamp_docs;
create policy lamp_docs_read on public.lamp_docs for select to authenticated using (public.lamp_can_read(path));
create policy lamp_docs_ins on public.lamp_docs for insert to authenticated with check (public.lamp_can_write(path));
create policy lamp_docs_upd on public.lamp_docs for update to authenticated using (public.lamp_can_write(path)) with check (public.lamp_can_write(path));
create policy lamp_docs_del on public.lamp_docs for delete to authenticated using (public.lamp_can_write(path));
drop policy if exists lamp_members_read on public.lamp_members;
drop policy if exists lamp_members_upd on public.lamp_members;
create policy lamp_members_read on public.lamp_members for select to authenticated using (public.lamp_is_member() or user_id = auth.uid());
create policy lamp_members_upd on public.lamp_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and role = (select m.role from public.lamp_members m where m.user_id = auth.uid()));
-- lamp_config has no policies: only the join function (security definer) reads it.

-- deep merge, so "update" only changes the fields it names (null removes nothing; it stores null like the Claude version)
create or replace function public.lamp_merge(a jsonb, b jsonb) returns jsonb
language sql immutable as $$
  select case
    when jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then
      (select coalesce(jsonb_object_agg(k, case when a ? k and b ? k then public.lamp_merge(a->k, b->k) when b ? k then b->k else a->k end), '{}'::jsonb)
         from (select jsonb_object_keys(a) k union select jsonb_object_keys(b)) keys)
    else b end $$;

create or replace function public.lamp_update(p text, patch jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare cur jsonb; out jsonb;
begin
  select data into cur from lamp_docs where path = p for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  out := lamp_merge(cur, patch);
  update lamp_docs set data = out, updated_by = auth.uid(), updated_at = now() where path = p;
  if not found then raise exception 'permission_denied' using errcode = '42501'; end if;
  return out;
end $$;

-- join with the group code; the first person to join becomes the leader
create or replace function public.lamp_join(code text, display_name text) returns text
language plpgsql security definer set search_path = public as $$
declare want text; r text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if exists(select 1 from lamp_members where user_id = auth.uid()) then
    return (select role from lamp_members where user_id = auth.uid()); end if;
  select value into want from lamp_config where key = 'join_code';
  if want is null or upper(trim(code)) <> upper(want) then raise exception 'wrong_code'; end if;
  r := case when exists(select 1 from lamp_members where role = 'leader') then 'member' else 'leader' end;
  insert into lamp_members(user_id, name, color, role) values (auth.uid(), left(trim(display_name), 40),
    (array['#3B5BBA','#B5523B','#A27A1D','#2E7D57','#6B4FA0','#1F7A8C','#C2563F','#4E6E2E'])[1 + floor(random()*8)::int], r);
  return r;
end $$;
revoke all on function public.lamp_join(text, text) from public, anon;
grant execute on function public.lamp_join(text, text) to authenticated;
grant execute on function public.lamp_update(text, jsonb) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lamp_docs') then
    alter publication supabase_realtime add table public.lamp_docs; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='lamp_members') then
    alter publication supabase_realtime add table public.lamp_members; end if;
end $$;

-- leaders can see and change the join code
create or replace function public.lamp_get_code() returns text
language sql stable security definer set search_path = public as
$$ select case when public.lamp_is_leader() then (select value from lamp_config where key = 'join_code') end $$;
create or replace function public.lamp_new_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.lamp_is_leader() then raise exception 'permission_denied'; end if;
  c := (array['LAMP','LIGHT','GRACE','PEACE','HOPE','FAITH','SALT','PATH','VINE','BREAD'])[1 + floor(random()*10)::int] || lpad((floor(random()*1000))::int::text, 3, '0');
  insert into lamp_config(key, value) values ('join_code', c) on conflict (key) do update set value = excluded.value;
  return c;
end $$;
revoke all on function public.lamp_get_code() from public, anon;
revoke all on function public.lamp_new_code() from public, anon;
grant execute on function public.lamp_get_code() to authenticated;
grant execute on function public.lamp_new_code() to authenticated;

-- explicit access for signed-in people (works even when "Automatically expose new tables" is off)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.lamp_docs to authenticated;
grant select, update on public.lamp_members to authenticated;
revoke all on public.lamp_docs, public.lamp_members, public.lamp_config from anon;
revoke all on public.lamp_config from authenticated;
grant execute on function public.lamp_is_member(), public.lamp_is_leader(), public.lamp_can_read(text), public.lamp_can_write(text), public.lamp_merge(jsonb, jsonb) to authenticated;
