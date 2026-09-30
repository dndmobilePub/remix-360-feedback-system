-- 이미 예전 schema.sql 을 실행한 DB 전용: 관리자 아이디(admin2286) 검증 추가
-- 비밀번호는 그대로 유지됩니다.

alter table public.admin_settings add column if not exists admin_id text;
update public.admin_settings set admin_id = 'admin2286' where id = 1;
alter table public.admin_settings alter column admin_id set not null;

drop function if exists public._auth_admin(text);
drop function if exists public.admin_login(text);
drop function if exists public.admin_change_password(text, text);
drop function if exists public.admin_get_all(text);
drop function if exists public.admin_create_session(text, text, text, text, text, jsonb);
drop function if exists public.admin_update_session(text, uuid, text, jsonb);
drop function if exists public.admin_delete_session(text, uuid);
drop function if exists public.admin_reset_code(text, uuid, uuid);

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

revoke execute on function public._auth_admin(text, text) from public, anon, authenticated;

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
