-- =====================================================================
-- 360 Feedback System - Supabase schema
-- Supabase Dashboard > SQL Editor 에 전체 붙여넣고 Run
--
-- 구조: 모든 테이블은 RLS ON + 정책 없음 => anon 키로 테이블 직접 접근 불가.
--       모든 접근은 SECURITY DEFINER RPC 함수를 통해서만 가능하며,
--       함수 안에서 (이름+코드) 또는 관리자 비밀번호를 검증합니다.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------
create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,               -- 이름으로 로그인하므로 동명이인이 있으면 "홍길동A" 처럼 구분
  team text not null,
  login_code_hash text not null,
  is_first_login boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  year text not null,
  type text not null check (type in ('360도 다면 피드백', '인사이트 피드백')),
  period text not null default '',         -- 'YYYY.MM.DD - YYYY.MM.DD'
  initial_code text not null,
  created_at timestamptz not null default now(),
  unique (year, type)
);

create table public.session_members (
  session_id uuid not null references public.sessions on delete cascade,
  member_id uuid not null references public.members on delete cascade,
  primary key (session_id, member_id)
);

create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  target_id uuid not null references public.members on delete cascade,
  author_id uuid not null references public.members on delete cascade,
  good text not null default '',
  suggestions text not null default '',
  rehire boolean,
  updated_at timestamptz not null default now(),
  unique (session_id, target_id, author_id)
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  author_id uuid not null references public.members on delete cascade,
  content text not null,
  updated_at timestamptz not null default now(),
  unique (session_id, author_id)
);

create table public.admin_settings (
  id int primary key check (id = 1),
  admin_id text not null,
  password_hash text not null
);

-- 관리자 아이디 admin2286 / 초기 비밀번호 0000 (로그인 후 비밀번호를 변경하세요)
insert into public.admin_settings values (1, 'admin2286', extensions.crypt('0000', extensions.gen_salt('bf')));

alter table public.members enable row level security;
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.feedbacks enable row level security;
alter table public.insights enable row level security;
alter table public.admin_settings enable row level security;

-- ---------- internal helpers (외부 호출 불가) ----------
create or replace function public._auth_member(p_name text, p_code text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  select id into v_id from members
   where name = p_name and login_code_hash = crypt(p_code, login_code_hash);
  if v_id is null then raise exception 'INVALID_LOGIN'; end if;
  return v_id;
end $$;

create or replace function public._auth_admin(p_id text, p_pw text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (
    select 1 from admin_settings
     where id = 1 and admin_id = p_id and password_hash = crypt(p_pw, password_hash)
  ) then
    raise exception 'INVALID_ADMIN';
  end if;
end $$;

create or replace function public._sync_session_members(p_sid uuid, p_members jsonb, p_code text, p_prune boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare m record; v_mid uuid; v_ids uuid[] := '{}';
begin
  for m in select x.name, x.team from jsonb_to_recordset(p_members) as x(name text, team text) loop
    insert into members (name, team, login_code_hash)
    values (trim(m.name), m.team, crypt(p_code, gen_salt('bf')))
    on conflict (name) do update set team = excluded.team
    returning id into v_mid;

    insert into session_members (session_id, member_id) values (p_sid, v_mid) on conflict do nothing;
    v_ids := v_ids || v_mid;
  end loop;

  if p_prune then
    delete from session_members where session_id = p_sid and member_id <> all (v_ids);
  end if;
end $$;

revoke execute on function public._auth_member(text, text) from public, anon, authenticated;
revoke execute on function public._auth_admin(text, text) from public, anon, authenticated;
revoke execute on function public._sync_session_members(uuid, jsonb, text, boolean) from public, anon, authenticated;

-- ---------- 직원용 RPC ----------
create or replace function public.member_login(p_name text, p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; r json;
begin
  v_id := _auth_member(p_name, p_code);
  select json_build_object('id', id, 'name', name, 'team', team, 'isFirstLogin', is_first_login)
    into r from members where id = v_id;
  return r;
end $$;

create or replace function public.member_change_code(p_name text, p_code text, p_new text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  v_id := _auth_member(p_name, p_code);
  if length(trim(p_new)) < 4 then raise exception 'CODE_TOO_SHORT'; end if;
  update members set login_code_hash = crypt(trim(p_new), gen_salt('bf')), is_first_login = false
   where id = v_id;
end $$;

-- 내가 속한 세션 + 세션 멤버(본인 포함, 코드 제외) + 내가 쓴 피드백만 반환
create or replace function public.member_get_sessions(p_name text, p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; r json;
begin
  v_id := _auth_member(p_name, p_code);
  select coalesce(json_agg(json_build_object(
    'id', s.id, 'year', s.year, 'type', s.type, 'period', s.period,
    'members', (
      select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name, 'team', m.team) order by m.team, m.name), '[]'::json)
        from session_members sm2 join members m on m.id = sm2.member_id
       where sm2.session_id = s.id),
    'myFeedbacks', (
      select coalesce(json_agg(json_build_object('targetId', f.target_id, 'good', f.good, 'suggestions', f.suggestions, 'rehire', f.rehire)), '[]'::json)
        from feedbacks f where f.session_id = s.id and f.author_id = v_id),
    'myInsight', (select i.content from insights i where i.session_id = s.id and i.author_id = v_id)
  ) order by s.year desc), '[]'::json)
  into r
  from sessions s join session_members sm on sm.session_id = s.id
  where sm.member_id = v_id;
  return r;
end $$;

create or replace function public.member_save_feedback(
  p_name text, p_code text, p_session uuid, p_target uuid, p_good text, p_sug text, p_rehire boolean)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  v_id := _auth_member(p_name, p_code);
  if v_id = p_target then raise exception 'SELF_FEEDBACK'; end if;
  if not exists (select 1 from session_members where session_id = p_session and member_id = v_id)
     or not exists (select 1 from session_members where session_id = p_session and member_id = p_target) then
    raise exception 'NOT_IN_SESSION';
  end if;
  insert into feedbacks (session_id, target_id, author_id, good, suggestions, rehire)
  values (p_session, p_target, v_id, coalesce(p_good, ''), coalesce(p_sug, ''), p_rehire)
  on conflict (session_id, target_id, author_id)
  do update set good = excluded.good, suggestions = excluded.suggestions,
                rehire = excluded.rehire, updated_at = now();
end $$;

create or replace function public.member_save_insight(p_name text, p_code text, p_session uuid, p_content text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  v_id := _auth_member(p_name, p_code);
  if not exists (select 1 from session_members where session_id = p_session and member_id = v_id) then
    raise exception 'NOT_IN_SESSION';
  end if;
  insert into insights (session_id, author_id, content) values (p_session, v_id, p_content)
  on conflict (session_id, author_id) do update set content = excluded.content, updated_at = now();
end $$;

-- ---------- 관리자용 RPC (모든 함수가 아이디 + 비밀번호를 함께 검증) ----------
create or replace function public.admin_login(p_id text, p_pw text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _auth_admin(p_id, p_pw);
  return true;
end $$;

create or replace function public.admin_change_password(p_id text, p_old text, p_new text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _auth_admin(p_id, p_old);
  if length(p_new) < 4 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  update admin_settings set password_hash = crypt(p_new, gen_salt('bf')) where id = 1;
end $$;

-- 전체 조회 (작성자 정보는 반환하지 않음 = 관리자에게도 익명)
create or replace function public.admin_get_all(p_id text, p_pw text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare r json;
begin
  perform _auth_admin(p_id, p_pw);
  select coalesce(json_agg(json_build_object(
    'id', s.id, 'year', s.year, 'type', s.type, 'period', s.period, 'code', s.initial_code,
    'members', (
      select coalesce(json_agg(json_build_object('id', m.id, 'name', m.name, 'team', m.team) order by m.team, m.name), '[]'::json)
        from session_members sm join members m on m.id = sm.member_id where sm.session_id = s.id),
    'feedbacks', (
      select coalesce(json_object_agg(t.target_id, t.items), '{}'::json)
        from (select f.target_id, json_agg(json_build_object('good', f.good, 'suggestions', f.suggestions, 'rehire', f.rehire)) as items
                from feedbacks f where f.session_id = s.id group by f.target_id) t),
    'insights', (
      select coalesce(json_agg(json_build_object('content', i.content)), '[]'::json)
        from insights i where i.session_id = s.id)
  ) order by s.year desc), '[]'::json)
  into r from sessions s;
  return r;
end $$;

create or replace function public.admin_create_session(
  p_id text, p_pw text, p_year text, p_type text, p_period text, p_code text, p_members jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_sid uuid;
begin
  perform _auth_admin(p_id, p_pw);
  insert into sessions (year, type, period, initial_code) values (p_year, p_type, p_period, p_code)
  returning id into v_sid;
  perform _sync_session_members(v_sid, p_members, p_code, false);
  return v_sid;
end $$;

create or replace function public.admin_update_session(p_id text, p_pw text, p_session uuid, p_period text, p_members jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_code text;
begin
  perform _auth_admin(p_id, p_pw);
  update sessions set period = p_period where id = p_session returning initial_code into v_code;
  perform _sync_session_members(p_session, p_members, v_code, true);
end $$;

create or replace function public.admin_delete_session(p_id text, p_pw text, p_session uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform _auth_admin(p_id, p_pw);
  delete from sessions where id = p_session;
end $$;

-- 직원 코드를 세션의 초기 코드로 초기화 (다음 로그인 때 코드 변경 화면으로 이동)
create or replace function public.admin_reset_code(p_id text, p_pw text, p_session uuid, p_member uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_code text;
begin
  perform _auth_admin(p_id, p_pw);
  select initial_code into v_code from sessions where id = p_session;
  update members set login_code_hash = crypt(v_code, gen_salt('bf')), is_first_login = true where id = p_member;
end $$;
